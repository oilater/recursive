import { describe, it, expect } from "vitest";
import { analyzeCode } from "../analyzer";

describe("analyzeCode", () => {
  it("단일 재귀 함수를 감지한다", () => {
    const { analysis } = analyzeCode(`
      function fibonacci(n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
      }
    `);

    expect(analysis.hasRecursion).toBe(true);
    expect(analysis.recursiveFuncName).toBe("fibonacci");
    expect(analysis.recursiveParamNames).toEqual(["n"]);
    expect(analysis.entryFuncName).toBe("__entry__");
    expect(analysis.entryParamNames).toEqual(["n"]);
    expect(analysis.userTopLevelFuncName).toBe("fibonacci");
  });

  it("중첩 재귀 함수를 감지한다 (exist → backtrack)", () => {
    const { analysis } = analyzeCode(`
      function exist(board, word) {
        function backtrack(r, c, depth) {
          if (depth === word.length) return true;
          if (backtrack(r + 1, c, depth + 1)) return true;
          return false;
        }
        return backtrack(0, 0, 0);
      }
    `);

    expect(analysis.hasRecursion).toBe(true);
    expect(analysis.recursiveFuncName).toBe("backtrack");
    expect(analysis.entryParamNames).toEqual(["board", "word"]);
    expect(analysis.userTopLevelFuncName).toBe("exist");
  });

  it("함수 없는 bare 코드를 __entry__로 래핑한다", () => {
    const { analysis, strippedCode } = analyzeCode(`
      const arr = [1, 2, 3];
      for (let i = 0; i < arr.length; i++) {
        console.log(arr[i]);
      }
    `);

    expect(analysis.hasRecursion).toBe(false);
    expect(analysis.entryFuncName).toBe("__entry__");
    expect(analysis.entryParamNames).toEqual([]);
    expect(analysis.userTopLevelFuncName).toBeNull();
    expect(analysis.lineOffset).toBe(1);
    expect(strippedCode).toContain("function __entry__()");
  });

  it("비재귀 함수를 인식한다", () => {
    const { analysis } = analyzeCode(`
      function sortColors(nums) {
        let low = 0, mid = 0, high = nums.length - 1;
        while (mid <= high) {
          if (nums[mid] === 0) { low++; mid++; }
          else if (nums[mid] === 1) { mid++; }
          else { high--; }
        }
        return nums;
      }
    `);

    expect(analysis.hasRecursion).toBe(false);
    expect(analysis.userTopLevelFuncName).toBe("sortColors");
    expect(analysis.entryParamNames).toEqual(["nums"]);
  });

  it("TypeScript 코드의 타입을 제거한다", () => {
    const { analysis } = analyzeCode(`
      function add(a: number, b: number): number {
        return add(a - 1, b + 1);
      }
    `);

    expect(analysis.hasRecursion).toBe(true);
    expect(analysis.recursiveFuncName).toBe("add");
  });

  it("화살표 함수를 인식한다", () => {
    const { analysis } = analyzeCode(`
      const factorial = (n) => {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
      };
    `);

    expect(analysis.hasRecursion).toBe(true);
    expect(analysis.recursiveFuncName).toBe("factorial");
  });

  it("throws syntax error", () => {
    expect(() => analyzeCode("function {{{")).toThrow("Syntax error");
  });

  it("로컬 변수를 추출한다", () => {
    const { analysis } = analyzeCode(`
      function test(x) {
        const a = 1;
        let b = 2;
        return x + a + b;
      }
    `);

    expect(analysis.localVarNames).toContain("a");
    expect(analysis.localVarNames).toContain("b");
  });
});
