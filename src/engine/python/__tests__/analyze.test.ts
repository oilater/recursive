import { describe, it, expect } from "vitest";
import { analyzePythonCode, stripSelfParam } from "../analyze";

describe("analyzePythonCode", () => {
  it("detects function name and params", () => {
    const result = analyzePythonCode("def add(a, b):\n    return a + b");
    expect(result.funcName).toBe("add");
    expect(result.paramNames).toEqual(["a", "b"]);
  });

  it("handles type annotations", () => {
    const result = analyzePythonCode("def solve(n: int, m: int) -> int:\n    pass");
    expect(result.funcName).toBe("solve");
    expect(result.paramNames).toEqual(["n", "m"]);
  });

  it("handles default values", () => {
    const result = analyzePythonCode("def greet(name, greeting='hello'):\n    pass");
    expect(result.funcName).toBe("greet");
    expect(result.paramNames).toEqual(["name", "greeting"]);
  });

  it("skips self parameter", () => {
    const result = analyzePythonCode("def method(self, x, y):\n    pass");
    expect(result.funcName).toBe("method");
    expect(result.paramNames).toEqual(["x", "y"]);
  });

  it("returns empty for no function", () => {
    const result = analyzePythonCode("x = 1\nprint(x)");
    expect(result.funcName).toBeNull();
    expect(result.paramNames).toEqual([]);
  });

  it("returns empty params for no-arg function", () => {
    const result = analyzePythonCode("def main():\n    pass");
    expect(result.funcName).toBe("main");
    expect(result.paramNames).toEqual([]);
  });

  it("finds first top-level function", () => {
    const code = `x = 1\n\ndef bubble_sort(arr):\n    n = len(arr)\n    return arr`;
    const result = analyzePythonCode(code);
    expect(result.funcName).toBe("bubble_sort");
    expect(result.paramNames).toEqual(["arr"]);
  });

  it("handles *args and **kwargs", () => {
    const result = analyzePythonCode("def func(a, *args, **kwargs):\n    pass");
    expect(result.funcName).toBe("func");
    expect(result.paramNames).toEqual(["a", "*args", "**kwargs"]);
  });

  it("handles nested function — finds outer", () => {
    const code = `def outer(n):\n    def inner(x):\n        return x\n    return inner(n)`;
    const result = analyzePythonCode(code);
    expect(result.funcName).toBe("outer");
    expect(result.paramNames).toEqual(["n"]);
  });

  it("handles complex type annotations", () => {
    const result = analyzePythonCode("def solve(grid: list[list[int]], target: str = 'x') -> bool:\n    pass");
    expect(result.funcName).toBe("solve");
    expect(result.paramNames).toEqual(["grid", "target"]);
  });

  it("handles decorator", () => {
    const code = `@cache\ndef fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)`;
    const result = analyzePythonCode(code);
    expect(result.funcName).toBe("fib");
    expect(result.paramNames).toEqual(["n"]);
  });

  it("handles multiple functions — picks first", () => {
    const code = `def a():\n    pass\ndef b(x):\n    pass`;
    const result = analyzePythonCode(code);
    expect(result.funcName).toBe("a");
    expect(result.paramNames).toEqual([]);
  });

  it("handles empty string", () => {
    const result = analyzePythonCode("");
    expect(result.funcName).toBeNull();
    expect(result.paramNames).toEqual([]);
  });
});

describe("stripSelfParam", () => {
  it("removes self from method", () => {
    expect(stripSelfParam("def foo(self, x, y):\n    pass"))
      .toBe("def foo(x, y):\n    pass");
  });

  it("removes self when it's the only param", () => {
    expect(stripSelfParam("def foo(self):\n    pass"))
      .toBe("def foo():\n    pass");
  });

  it("does not touch functions without self", () => {
    const code = "def foo(a, b):\n    pass";
    expect(stripSelfParam(code)).toBe(code);
  });

  it("handles nested methods", () => {
    const code = "def outer(self, x):\n    def inner(self, y):\n        pass";
    expect(stripSelfParam(code))
      .toBe("def outer(x):\n    def inner(y):\n        pass");
  });

  it("handles type annotations with self", () => {
    expect(stripSelfParam("def solve(self, nums: list[int]) -> int:\n    pass"))
      .toBe("def solve(nums: list[int]) -> int:\n    pass");
  });
});
