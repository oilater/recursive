import { describe, it, expect } from "vitest";
import type { TreeNode } from "@/algorithm/types";
import { cloneFrame, formatArgs, type WorkerFrame } from "../worker-helpers";

describe("formatArgs", () => {
  describe("primitives", () => {
    it("joins numbers with ', '", () => {
      expect(formatArgs([1, 2, 3])).toBe("1, 2, 3");
    });

    it("renders strings verbatim (no quotes)", () => {
      expect(formatArgs(["hello", "world"])).toBe("hello, world");
    });

    it("renders booleans as 'true' / 'false'", () => {
      expect(formatArgs([true, false])).toBe("true, false");
    });

    it("renders undefined and null literally", () => {
      expect(formatArgs([undefined, null])).toBe("undefined, null");
    });

    it("handles empty arg list", () => {
      expect(formatArgs([])).toBe("");
    });
  });

  describe("1D arrays", () => {
    it("renders short arrays in full as '[a,b,c]'", () => {
      expect(formatArgs([[1, 2, 3]])).toBe("[1,2,3]");
    });

    it("renders arrays of length exactly 8 in full", () => {
      expect(formatArgs([[1, 2, 3, 4, 5, 6, 7, 8]])).toBe("[1,2,3,4,5,6,7,8]");
    });

    it("truncates arrays longer than 8 to first 3 + count", () => {
      expect(formatArgs([[1, 2, 3, 4, 5, 6, 7, 8, 9]])).toBe("[1,2,3,...(9)]");
    });

    it("renders empty arrays as '[]'", () => {
      expect(formatArgs([[]])).toBe("[]");
    });
  });

  describe("2D arrays", () => {
    it("renders a 2D array as '[[...]](RxC)' using outer length and inner-first length", () => {
      expect(formatArgs([[[1, 2], [3, 4]]])).toBe("[[...]](2x2)");
    });

    it("uses the first row's length for C, even when other rows differ", () => {
      // Preserves the legacy-worker behavior: only the first row informs the C dimension.
      expect(formatArgs([[[1, 2, 3], [4, 5]]])).toBe("[[...]](2x3)");
    });
  });

  describe("objects", () => {
    it("JSON-stringifies short objects", () => {
      expect(formatArgs([{ a: 1 }])).toBe('{"a":1}');
    });

    it("truncates objects whose JSON exceeds 20 chars with '...' at the 17th char", () => {
      const result = formatArgs([{ longKey: "value-that-is-long" }]);
      expect(result.length).toBe(20);
      expect(result.endsWith("...")).toBe(true);
    });
  });

  describe("mixed args", () => {
    it("joins a mix of primitives, arrays, and objects", () => {
      expect(formatArgs([1, [2, 3], { x: 4 }])).toBe('1, [2,3], {"x":4}');
    });
  });
});

describe("cloneFrame", () => {
  const makeFrame = (overrides: Partial<WorkerFrame> = {}): WorkerFrame => ({
    funcName: "factorial",
    variables: { n: 5, acc: 1 },
    ownVarNames: ["n", "acc"],
    ...overrides,
  });

  it("preserves funcName, variables, and ownVarNames", () => {
    const clone = cloneFrame(makeFrame());
    expect(clone.funcName).toBe("factorial");
    expect(clone.variables).toEqual({ n: 5, acc: 1 });
    expect(clone.ownVarNames).toEqual(["n", "acc"]);
  });

  it("produces a fresh `variables` object (mutating clone does not affect original)", () => {
    const original = makeFrame();
    const clone = cloneFrame(original);
    clone.variables.n = 999;
    expect(original.variables.n).toBe(5);
  });

  it("shares variable references at the value level (shallow per-key copy)", () => {
    // Nested object is intentionally shared — deep-cloning happens at collection
    // time in __traceLine, not here. Documenting the contract.
    const shared = { inner: 42 };
    const original = makeFrame({ variables: { ref: shared } });
    const clone = cloneFrame(original);
    expect(clone.variables.ref).toBe(shared);
  });

  it("preserves lastLine when set on the source", () => {
    const clone = cloneFrame(makeFrame({ lastLine: 17 }));
    expect(clone.lastLine).toBe(17);
  });

  it("leaves lastLine undefined when absent on the source", () => {
    const clone = cloneFrame(makeFrame());
    expect(clone.lastLine).toBeUndefined();
  });

  it("preserves nodeId and node when present", () => {
    const node: TreeNode = {
      id: "node-1",
      label: "factorial",
      args: "5",
      children: [],
      status: "idle",
    };
    const clone = cloneFrame(makeFrame({ nodeId: "node-1", node }));
    expect(clone.nodeId).toBe("node-1");
    expect(clone.node).toBe(node);
  });

  it("leaves nodeId and node undefined when absent (non-recursive frame)", () => {
    const clone = cloneFrame(makeFrame());
    expect(clone.nodeId).toBeUndefined();
    expect(clone.node).toBeUndefined();
  });
});
