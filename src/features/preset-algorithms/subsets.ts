import type { TreeNode, StepGeneratorResult, AlgorithmMeta } from "@/entities/algorithm";
import {
  createTraceContext,
  createNodeFactory,
  createStepPushers,
  attachToParent,
  extendPath,
} from "@/entities/algorithm/lib/step-factory";
import { parseLineMarkers } from "@/shared/lib/line-marker";

const RAW_CODE = `function subsets(index, current) { // @line:functionDef
  result.push([...current]);         // @line:addResult
  for (let i = index; i < nums.length; i++) {
    current.push(nums[i]);           // @line:pushElement
    subsets(i + 1, current);
    current.pop();                   // @line:popElement
  }
}`;

const { lineMap: LINE, cleanCode: CODE } = parseLineMarkers(RAW_CODE);

function generateSteps(input: Record<string, unknown>): StepGeneratorResult {
  const elements = input.elements as number[];
  const ctx = createTraceContext();
  const makeNode = createNodeFactory("subsets");
  const { pushCall, pushReturn } = createStepPushers(ctx);
  const rootTree: TreeNode = makeNode(ctx, "0, []");

  function subsets(index: number, current: number[], parentNode: TreeNode, path: string[]): void {
    const node = makeNode(ctx, `${index}, [${current.join(",")}]`);
    attachToParent(parentNode, node);
    const currentPath = extendPath(path, node.id);
    const snapshot = () => ({ index, current: [...current], nums: [...elements], depth: currentPath.length - 1 });

    pushCall(LINE.functionDef, node.id, currentPath, snapshot(), `subsets(${index}, [${current.join(",")}]) 호출`);
    pushCall(
      LINE.addResult,
      node.id,
      currentPath,
      { ...snapshot(), result: `[${current.length === 0 ? "빈 배열" : current.join(",")}]` },
      `결과에 [${current.length === 0 ? "빈 배열" : current.join(",")}] 추가`
    );

    for (let i = index; i < elements.length; i++) {
      pushCall(
        LINE.pushElement,
        node.id,
        currentPath,
        { ...snapshot(), i, element: elements[i] },
        `current에 ${elements[i]} 추가`
      );
      current.push(elements[i]);
      subsets(i + 1, current, node, currentPath);
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
    pushReturn(LINE.functionDef, node.id, path, snapshot(), `subsets(${index}, [${current.join(",")}]) 리턴`);
  }

  subsets(0, [], rootTree, []);
  return { steps: ctx.steps, tree: rootTree };
}

export const subsetsMeta: AlgorithmMeta = {
  id: "subsets",
  name: "부분집합 (Subsets)",
  description: "주어진 배열의 모든 부분집합을 구합니다",
  difficulty: "easy",
  code: CODE,
  inputConfig: {
    type: "array",
    label: "배열 입력",
    defaults: { elements: [1, 2, 3] },
    constraints: { maxLength: 8, minLength: 1, noDuplicates: true },
  },
  isPremium: false,
};

export const subsetsGenerator = generateSteps;
