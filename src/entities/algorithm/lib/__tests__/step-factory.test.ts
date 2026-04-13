import { describe, it, expect } from "vitest";
import {
  createTraceContext,
  createNodeFactory,
  createStepPushers,
  attachToParent,
  extendPath,
} from "../step-factory";

describe("createTraceContext", () => {
  it("빈 컨텍스트를 생성한다", () => {
    const ctx = createTraceContext();
    expect(ctx.steps).toEqual([]);
    expect(ctx.stepId).toBe(0);
    expect(ctx.nodeIdCounter).toBe(0);
  });
});

describe("createNodeFactory", () => {
  it("label이 고정된 노드 생성 함수를 반환한다", () => {
    const ctx = createTraceContext();
    const makeNode = createNodeFactory("permute");

    const node1 = makeNode(ctx, "[1,2]");
    const node2 = makeNode(ctx, "[3]");

    expect(node1.label).toBe("permute");
    expect(node1.id).toBe("node-0");
    expect(node1.args).toBe("[1,2]");
    expect(node1.children).toEqual([]);
    expect(node1.status).toBe("idle");

    expect(node2.id).toBe("node-1");
  });
});

describe("createStepPushers", () => {
  it("pushCall로 call 스텝을 생성한다", () => {
    const ctx = createTraceContext();
    const { pushCall } = createStepPushers(ctx);

    pushCall(1, "node-0", ["node-0"], { x: 1 }, "테스트 호출");

    expect(ctx.steps).toHaveLength(1);
    expect(ctx.steps[0].type).toBe("call");
    expect(ctx.steps[0].codeLine).toBe(1);
    expect(ctx.steps[0].description).toBe("테스트 호출");
  });

  it("pushReturn으로 return 스텝을 생성한다", () => {
    const ctx = createTraceContext();
    const { pushReturn } = createStepPushers(ctx);

    pushReturn(5, "node-0", ["node-0"], { x: 1 }, "테스트 리턴");

    expect(ctx.steps[0].type).toBe("return");
  });

  it("stepId가 자동 증가한다", () => {
    const ctx = createTraceContext();
    const { pushCall } = createStepPushers(ctx);

    pushCall(1, "n-0", [], {}, "a");
    pushCall(2, "n-0", [], {}, "b");

    expect(ctx.steps[0].id).toBe(0);
    expect(ctx.steps[1].id).toBe(1);
  });
});

describe("attachToParent", () => {
  it("자식을 부모의 children에 추가한다", () => {
    const ctx = createTraceContext();
    const makeNode = createNodeFactory("test");
    const parent = makeNode(ctx, "parent");
    const child = makeNode(ctx, "child");

    attachToParent(parent, child);

    expect(parent.children).toHaveLength(1);
    expect(parent.children[0].id).toBe(child.id);
  });
});

describe("extendPath", () => {
  it("경로에 노드를 추가한다", () => {
    expect(extendPath(["a", "b"], "c")).toEqual(["a", "b", "c"]);
  });

  it("빈 경로에도 동작한다", () => {
    expect(extendPath([], "root")).toEqual(["root"]);
  });
});
