import { describe, it, expect } from "vitest";
import { analyzePythonCode } from "../analyze";

describe("analyzePythonCode", () => {
  it("should detect function name and params", () => {
    const result = analyzePythonCode("def add(a, b):\n    return a + b");
    expect(result.funcName).toBe("add");
    expect(result.paramNames).toEqual(["a", "b"]);
  });

  it("should handle type annotations", () => {
    const result = analyzePythonCode("def solve(n: int, m: int) -> int:\n    pass");
    expect(result.funcName).toBe("solve");
    expect(result.paramNames).toEqual(["n", "m"]);
  });

  it("should handle default values", () => {
    const result = analyzePythonCode("def greet(name, greeting='hello'):\n    pass");
    expect(result.funcName).toBe("greet");
    expect(result.paramNames).toEqual(["name", "greeting"]);
  });

  it("should skip self parameter", () => {
    const result = analyzePythonCode("def method(self, x, y):\n    pass");
    expect(result.funcName).toBe("method");
    expect(result.paramNames).toEqual(["x", "y"]);
  });

  it("should return empty for no function", () => {
    const result = analyzePythonCode("x = 1\nprint(x)");
    expect(result.funcName).toBeNull();
    expect(result.paramNames).toEqual([]);
  });

  it("should return empty params for no-arg function", () => {
    const result = analyzePythonCode("def main():\n    pass");
    expect(result.funcName).toBe("main");
    expect(result.paramNames).toEqual([]);
  });

  it("should find first top-level function", () => {
    const code = `x = 1

def bubble_sort(arr):
    n = len(arr)
    return arr`;
    const result = analyzePythonCode(code);
    expect(result.funcName).toBe("bubble_sort");
    expect(result.paramNames).toEqual(["arr"]);
  });
});
