import type { TreeNode, StepGeneratorResult, AlgorithmMeta } from "@/entities/algorithm";
import {
  createTraceContext,
  createNodeFactory,
  createStepPushers,
  attachToParent,
  extendPath,
} from "@/entities/algorithm/lib/step-factory";
import { parseLineMarkers } from "@/shared/lib/line-marker";

const RAW_CODE = `function combine(start, current) { // @line:functionDef
  if (current.length === r) {
    result.push([...current]);       // @line:addResult
    return;                          // @line:baseReturn
  }
  for (let i = start; i <= n; i++) {
    current.push(i);                 // @line:pushElement
    combine(i + 1, current);
    current.pop();                   // @line:popElement
  }
}`;

const { lineMap: LINE, cleanCode: CODE } = parseLineMarkers(RAW_CODE);

function generateSteps(input: Record<string, unknown>): StepGeneratorResult {
  const n = input.n as number;
  const r = input.r as number;
  const ctx = createTraceContext();
  const makeNode = createNodeFactory("combine");
  const { pushCall, pushReturn } = createStepPushers(ctx);
  const rootTree: TreeNode = makeNode(ctx, "1, []");

  function combine(start: number, current: number[], parentNode: TreeNode, path: string[]): void {
    const node = makeNode(ctx, `${start}, [${current.join(",")}]`);
    attachToParent(parentNode, node);
    const currentPath = extendPath(path, node.id);
    const snapshot = () => ({ start, current: [...current], r, n, depth: currentPath.length - 1 });

    pushCall(LINE.functionDef, node.id, currentPath, snapshot(), `combine(${start}, [${current.join(",")}]) 호출`);

    if (current.length === r) {
      pushCall(
        LINE.addResult,
        node.id,
        currentPath,
        { ...snapshot(), result: `[${current.join(",")}]` },
        `결과에 [${current.join(",")}] 추가`
      );
      node.status = "completed";
      pushReturn(LINE.baseReturn, node.id, currentPath, snapshot(), `combine(${start}, [${current.join(",")}]) 리턴`);
      return;
    }

    for (let i = start; i <= n; i++) {
      pushCall(LINE.pushElement, node.id, currentPath, { ...snapshot(), i }, `current에 ${i} 추가`);
      current.push(i);
      combine(i + 1, current, node, currentPath);
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
    pushReturn(LINE.functionDef, node.id, path, snapshot(), `combine(${start}, [${current.join(",")}]) 리턴`);
  }

  combine(1, [], rootTree, []);
  return { steps: ctx.steps, tree: rootTree };
}

export const combinationsMeta: AlgorithmMeta = {
  id: "combinations",
  name: "조합 (Combinations)",
  description: "n개 중 r개를 선택하는 모든 조합을 구합니다",
  difficulty: "easy",
  code: CODE,
  inputConfig: { type: "nk", label: "n, r 입력", defaults: { n: 4, r: 2 }, constraints: { maxN: 8, minN: 1, minR: 1 } },
  isPremium: false,
};

export const combinationsGenerator = generateSteps;
