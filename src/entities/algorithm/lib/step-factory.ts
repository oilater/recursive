import type { Step, StepType, TreeNode } from "@/entities/algorithm";

/**
 * Step/TreeNode 생성을 위한 상태 관리 컨텍스트.
 * 각 StepGenerator 실행마다 하나씩 생성됩니다.
 */
export interface TraceContext {
  steps: Step[];
  stepId: number;
  nodeIdCounter: number;
}

export const createTraceContext = (): TraceContext => ({
  steps: [],
  stepId: 0,
  nodeIdCounter: 0,
});

const nextNodeId = (ctx: TraceContext): string => `node-${ctx.nodeIdCounter++}`;
const nextStepId = (ctx: TraceContext): number => ctx.stepId++;

/**
 * 특정 함수명에 대한 TreeNode 팩토리를 반환합니다. (curried)
 *
 *   const makeNode = createNodeFactory("permute");
 *   const node = makeNode(ctx, "[1,2], [3]");
 */
export const createNodeFactory =
  (label: string) =>
  (ctx: TraceContext, args: string): TreeNode => ({
    id: nextNodeId(ctx),
    label,
    args,
    children: [],
    status: "idle",
  });

/**
 * Step push 함수를 반환합니다. (curried: ctx → type)
 *
 *   const { pushCall, pushReturn } = createStepPushers(ctx);
 *   pushCall(codeLine, nodeId, path, vars, desc);
 */
export const createStepPushers = (ctx: TraceContext) => {
  const push =
    (type: StepType) =>
    (
      codeLine: number,
      nodeId: string,
      activePath: string[],
      variables: Record<string, unknown>,
      description: string
    ): Step => {
      const step: Step = {
        id: nextStepId(ctx),
        type,
        codeLine,
        activeNodeId: nodeId,
        activePath: [...activePath],
        variables: { ...variables },
        description,
      };
      ctx.steps.push(step);
      return step;
    };

  return {
    pushCall: push("call"),
    pushReturn: push("return"),
  };
};

/**
 * 노드를 부모에 연결합니다.
 */
export const attachToParent = (parent: TreeNode, child: TreeNode): void => {
  parent.children.push(child);
};

/**
 * activePath를 확장합니다.
 */
export const extendPath = (path: string[], nodeId: string): string[] => [...path, nodeId];
