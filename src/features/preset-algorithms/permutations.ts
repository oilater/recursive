import type { TreeNode, StepGeneratorResult, AlgorithmMeta } from "@/entities/algorithm";
import {
  createTraceContext,
  createNodeFactory,
  createStepPushers,
  attachToParent,
  extendPath,
} from "@/entities/algorithm/lib/step-factory";
import { parseLineMarkers } from "@/shared/lib/line-marker";

const RAW_CODE = `function permute(current, remaining) { // @line:functionDef
  if (remaining.length === 0) {          // @line:baseCheck
    result.push([...current]);           // @line:addResult
    return;                              // @line:baseReturn
  }
  for (let i = 0; i < remaining.length; i++) {
    current.push(remaining[i]);          // @line:pushElement
    const next = remaining.filter((_, j) => j !== i);
    permute(current, next);
    current.pop();                       // @line:popElement
  }
}`;

const { lineMap: LINE, cleanCode: CODE } = parseLineMarkers(RAW_CODE);

function generateSteps(input: Record<string, unknown>): StepGeneratorResult {
  const elements = input.elements as number[];
  const ctx = createTraceContext();
  const makeNode = createNodeFactory("permute");
  const { pushCall, pushReturn } = createStepPushers(ctx);

  const rootTree: TreeNode = makeNode(ctx, `[], [${elements.join(",")}]`);

  function permute(current: number[], remaining: number[], parentNode: TreeNode, path: string[]): void {
    const node = makeNode(ctx, `[${current.join(",")}], [${remaining.join(",")}]`);
    attachToParent(parentNode, node);
    const currentPath = extendPath(path, node.id);
    const snapshot = () => ({ current: [...current], remaining: [...remaining], depth: currentPath.length - 1 });

    pushCall(
      LINE.functionDef,
      node.id,
      currentPath,
      snapshot(),
      `permute([${current.join(",")}], [${remaining.join(",")}]) 호출`
    );

    if (remaining.length === 0) {
      pushCall(
        LINE.addResult,
        node.id,
        currentPath,
        { ...snapshot(), result: `[${current.join(",")}]` },
        `결과에 [${current.join(",")}] 추가`
      );
      node.status = "completed";
      pushReturn(LINE.baseReturn, node.id, currentPath, snapshot(), `permute([${current.join(",")}], []) 리턴`);
      return;
    }

    for (let i = 0; i < remaining.length; i++) {
      pushCall(
        LINE.pushElement,
        node.id,
        currentPath,
        { ...snapshot(), i, element: remaining[i] },
        `current에 ${remaining[i]} 추가`
      );
      current.push(remaining[i]);
      const next = remaining.filter((_, j) => j !== i);
      permute(current, next, node, currentPath);
      pushCall(
        LINE.popElement,
        node.id,
        currentPath,
        { ...snapshot(), i },
        `current에서 ${current[current.length - 1]} 제거 (백트래킹)`
      );
      current.pop();
    }

    node.status = "completed";
    pushReturn(
      LINE.functionDef,
      node.id,
      path,
      snapshot(),
      `permute([${current.join(",")}], [${remaining.join(",")}]) 리턴`
    );
  }

  permute([], [...elements], rootTree, []);
  return { steps: ctx.steps, tree: rootTree };
}

export const permutationsMeta: AlgorithmMeta = {
  id: "permutations",
  name: "순열 (Permutations)",
  description: "주어진 배열의 모든 순서 조합을 구합니다",
  difficulty: "easy",
  code: CODE,
  inputConfig: {
    type: "array",
    label: "배열 입력",
    defaults: { elements: [1, 2, 3] },
    constraints: { maxLength: 6, minLength: 1, noDuplicates: true },
  },
  isPremium: false,
};

export const permutationsGenerator = generateSteps;
