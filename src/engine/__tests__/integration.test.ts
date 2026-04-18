import { describe, it, expect } from "vitest";
import { analyzeCode } from "../analyzer";
import { transformCode } from "../transformer";

interface TraceResult {
  tracedLines: number[];
  varSnapshots: Record<string, unknown>[];
}

function runTransformed(code: string, args: unknown[] = []): TraceResult {
  const { analysis, strippedCode } = analyzeCode(code);
  const transformed = transformCode(strippedCode, analysis);

  const tracedLines: number[] = [];
  const varSnapshots: Record<string, unknown>[] = [];
  const lineOffset = analysis.lineOffset;

  function __traceLine(line: number, vars: Record<string, unknown>) {
    const corrected = line - lineOffset;
    if (corrected >= 1) {
      tracedLines.push(corrected);
      if (vars) varSnapshots.push({ ...vars });
    }
  }

  function __guard() {}
  function __createProxy(fn: unknown) { return fn; }

  const hasArgs = analysis.userTopLevelFuncName && args.length > 0;
  const runCode = hasArgs
    ? transformed + `\nvar __fn = __entry__();\nreturn __fn.apply(null, __args);\n`
    : transformed + `\n__entry__();\n`;

  const runFn = new Function("__guard", "__createProxy", "__traceLine", "__args", "console", runCode);
  runFn(__guard, __createProxy, __traceLine, args, { log() {} });

  return { tracedLines, varSnapshots };
}

describe("JS engine: bare code (no function)", () => {
  it("traces variable assignments", () => {
    const { tracedLines, varSnapshots } = runTransformed(`
const a = 1;
const b = 2;
const c = a + b;
    `);

    expect(tracedLines.length).toBeGreaterThanOrEqual(3);
    const last = varSnapshots[varSnapshots.length - 1];
    expect(last.a).toBe(1);
    expect(last.b).toBe(2);
    expect(last.c).toBe(3);
  });

  it("traces for loop", () => {
    const { tracedLines, varSnapshots } = runTransformed(`
const arr = [1, 2, 3];
let total = 0;
for (let i = 0; i < arr.length; i++) {
  total += arr[i];
}
    `);

    expect(tracedLines.length).toBeGreaterThan(3);
    const last = varSnapshots[varSnapshots.length - 1];
    expect(last.total).toBe(6);
  });

  it("traces while loop", () => {
    const { tracedLines, varSnapshots } = runTransformed(`
let n = 5;
let result = 1;
while (n > 1) {
  result *= n;
  n--;
}
    `);

    expect(tracedLines.length).toBeGreaterThan(3);
    const last = varSnapshots[varSnapshots.length - 1];
    expect(last.result).toBe(120);
  });

  it("traces if/else", () => {
    const { tracedLines } = runTransformed(`
const x = 10;
let msg;
if (x > 0) {
  msg = "positive";
} else {
  msg = "non-positive";
}
    `);

    expect(tracedLines.length).toBeGreaterThanOrEqual(3);
  });

  it("traces array operations", () => {
    const { varSnapshots } = runTransformed(`
const arr = [3, 1, 2];
arr.sort((a, b) => a - b);
    `);

    const last = varSnapshots[varSnapshots.length - 1];
    expect(last.arr).toEqual([1, 2, 3]);
  });

  it("traces object operations", () => {
    const { varSnapshots } = runTransformed(`
const obj = { a: 1, b: 2 };
obj.c = obj.a + obj.b;
    `);

    const last = varSnapshots[varSnapshots.length - 1];
    expect((last.obj as Record<string, number>).c).toBe(3);
  });

  it("traces multiple function definitions + calls", () => {
    const { tracedLines } = runTransformed(`
function a() {
  return 1;
}
function b() {
  return 2;
}
a();
b();
    `);

    expect(tracedLines.length).toBeGreaterThan(0);
  });
});

describe("JS engine: function with args", () => {
  it("traces simple function", () => {
    const { tracedLines, varSnapshots } = runTransformed(`
function add(a, b) {
  return a + b;
}
    `, [3, 5]);

    expect(tracedLines.length).toBeGreaterThanOrEqual(1);
    const last = varSnapshots[varSnapshots.length - 1];
    expect(last.a).toBe(3);
    expect(last.b).toBe(5);
  });

  it("traces bubble sort with args", () => {
    const { tracedLines, varSnapshots } = runTransformed(`
function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
  return arr;
}
    `, [[5, 3, 8, 1, 2]]);

    expect(tracedLines.length).toBeGreaterThan(10);
    const last = varSnapshots[varSnapshots.length - 1];
    expect(last.arr).toEqual([1, 2, 3, 5, 8]);

    // for-loop-scoped i/j and if-block-scoped temp must show real values
    // inside their lexical scopes, not "-" (regression: __captureVars at
    // function top couldn't reach block-scoped vars)
    expect(varSnapshots.some((s) => typeof s.i === "number")).toBe(true);
    expect(varSnapshots.some((s) => typeof s.j === "number")).toBe(true);
    expect(varSnapshots.some((s) => typeof s.temp === "number")).toBe(true);
  });

  it("traces recursive function (factorial)", () => {
    const { tracedLines } = runTransformed(`
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
    `, [5]);

    expect(tracedLines.length).toBeGreaterThan(5);
  });

  it("emits a pre-return trace so the stack visibly unwinds", () => {
    // factorial(3) should emit steps during unwind — at factorial(2) and factorial(3)'s
    // return lines — showing the parent frame active after the child popped.
    const { varSnapshots } = runTransformed(`
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
    `, [3]);

    const last = varSnapshots[varSnapshots.length - 1];
    // Last snapshot should be at factorial(3) level (after full unwind), n=3
    expect(last.n).toBe(3);
  });

  it("traces nested recursive function", () => {
    const { tracedLines } = runTransformed(`
function uniquePaths(m, n) {
  function dfs(r, c) {
    if (r === m - 1 && c === n - 1) return 1;
    if (r >= m || c >= n) return 0;
    return dfs(r + 1, c) + dfs(r, c + 1);
  }
  return dfs(0, 0);
}
    `, [3, 3]);

    expect(tracedLines.length).toBeGreaterThan(10);
  });

  it("traces function with array destructuring", () => {
    const { tracedLines } = runTransformed(`
function swap(arr, i, j) {
  const temp = arr[i];
  arr[i] = arr[j];
  arr[j] = temp;
  return arr;
}
    `, [[1, 2, 3], 0, 2]);

    expect(tracedLines.length).toBeGreaterThanOrEqual(4);
  });

  it("traces selection sort with args", () => {
    const { tracedLines, varSnapshots } = runTransformed(`
function selectionSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    for (let j = i + 1; j < n; j++) {
      if (arr[j] < arr[minIdx]) {
        minIdx = j;
      }
    }
    if (minIdx !== i) {
      const temp = arr[i];
      arr[i] = arr[minIdx];
      arr[minIdx] = temp;
    }
  }
  return arr;
}
    `, [[5, 3, 8, 1, 2]]);

    expect(tracedLines.length).toBeGreaterThan(10);
    const last = varSnapshots[varSnapshots.length - 1];
    expect(last.arr).toEqual([1, 2, 3, 5, 8]);
  });
});

describe("JS engine: TypeScript code", () => {
  it("strips type annotations and traces", () => {
    const { tracedLines } = runTransformed(`
function add(a: number, b: number): number {
  return a + b;
}
    `, [3, 5]);

    expect(tracedLines.length).toBeGreaterThanOrEqual(1);
  });

  it("handles interface-like types", () => {
    const { tracedLines } = runTransformed(`
function greet(name: string): string {
  const msg: string = "Hello " + name;
  return msg;
}
    `, ["world"]);

    expect(tracedLines.length).toBeGreaterThanOrEqual(2);
  });
});

describe("JS engine: edge cases", () => {
  it("handles empty function", () => {
    const { tracedLines } = runTransformed(`
function empty() {}
    `, []);

    expect(tracedLines).toBeDefined();
  });

  it("handles single expression", () => {
    const { tracedLines } = runTransformed(`
const x = 42;
    `);

    expect(tracedLines.length).toBeGreaterThanOrEqual(1);
  });

  it("handles nested loops", () => {
    const { tracedLines } = runTransformed(`
let count = 0;
for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    count++;
  }
}
    `);

    expect(tracedLines.length).toBeGreaterThan(5);
  });

  it("handles try-catch", () => {
    const { tracedLines } = runTransformed(`
let result;
try {
  result = JSON.parse('{"a":1}');
} catch (e) {
  result = null;
}
    `);

    expect(tracedLines.length).toBeGreaterThanOrEqual(2);
  });

  it("handles ternary operator", () => {
    const { varSnapshots } = runTransformed(`
const x = 5;
const y = x > 3 ? "big" : "small";
    `);

    const last = varSnapshots[varSnapshots.length - 1];
    expect(last.y).toBe("big");
  });

  it("handles arrow function with args", () => {
    const { tracedLines } = runTransformed(`
const double = (n) => {
  return n * 2;
};
    `, [5]);

    expect(tracedLines.length).toBeGreaterThanOrEqual(1);
  });
});

describe("JS engine: function form equivalence (currying)", () => {
  const formFunction = `
function add(num) {
  return function internal(addNum) {
    return addNum + num;
  };
}
const addTen = add(10);
const addFive = add(5);
const fifteen = addTen(5);
const alsoFifteen = addFive(10);
const equal = fifteen === alsoFifteen;
  `;

  const formArrow = `
const add = (num) => (addNum) => addNum + num;
const addTen = add(10);
const addFive = add(5);
const fifteen = addTen(5);
const alsoFifteen = addFive(10);
const equal = fifteen === alsoFifteen;
  `;

  function lastVars(code: string) {
    const { varSnapshots } = runTransformed(code);
    return varSnapshots[varSnapshots.length - 1];
  }

  it("function declaration and const arrow produce the same final values", () => {
    const a = lastVars(formFunction);
    const b = lastVars(formArrow);
    expect(a.fifteen).toBe(15);
    expect(a.alsoFifteen).toBe(15);
    expect(a.equal).toBe(true);
    expect(b.fifteen).toBe(15);
    expect(b.alsoFifteen).toBe(15);
    expect(b.equal).toBe(true);
  });

  it("both forms wrap the inner function with __createProxy (D12 — every function expression wrapped)", () => {
    const { analysis: aAnalysis, strippedCode: aWrapped } = analyzeCode(formFunction);
    const { analysis: bAnalysis, strippedCode: bWrapped } = analyzeCode(formArrow);
    const tA = transformCode(aWrapped, aAnalysis);
    const tB = transformCode(bWrapped, bAnalysis);

    const proxyCountA = (tA.match(/__createProxy\(/g) || []).length;
    const proxyCountB = (tB.match(/__createProxy\(/g) || []).length;
    expect(proxyCountA).toBeGreaterThanOrEqual(2);
    expect(proxyCountB).toBeGreaterThanOrEqual(2);

    expect(tA).toMatch(/__createProxy\(function internal/);
    // astring may emit single-param arrows as `n =>` or `(n) =>`
    expect(tB).toMatch(/__createProxy\([^,]*=>/);
  });

  it("both forms trace the inner function body when called via the closure handle", () => {
    const a = runTransformed(formFunction);
    const b = runTransformed(formArrow);
    expect(a.tracedLines.length).toBeGreaterThan(0);
    expect(b.tracedLines.length).toBeGreaterThan(0);
  });
});
