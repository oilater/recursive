import type { TreeNode, StepGeneratorResult, AlgorithmMeta } from "@/entities/algorithm";
import { createBoard, cloneBoard } from "@/shared/lib/clone";
import { countInMatrix } from "@/shared/lib/array";
import {
  createTraceContext,
  createNodeFactory,
  createStepPushers,
  attachToParent,
  extendPath,
} from "@/entities/algorithm/lib/step-factory";
import { parseLineMarkers } from "@/shared/lib/line-marker";

const RAW_CODE = `function solve(row, board) { // @line:functionDef
  if (row === n) {
    solutions.push(board.map(r => [...r])); // @line:addSolution
    return;                                 // @line:baseReturn
  }
  for (let col = 0; col < n; col++) {
    if (isSafe(row, col)) {                 // @line:safeCheck
      board[row][col] = 1;                  // @line:placeQueen
      solve(row + 1, board);
      board[row][col] = 0;                  // @line:removeQueen
    }
  }
}`;

const { lineMap: LINE, cleanCode: CODE } = parseLineMarkers(RAW_CODE);

const isSafe = (board: number[][], row: number, col: number, n: number): boolean => {
  for (let i = 0; i < row; i++) if (board[i][col] === 1) return false;
  for (let i = row - 1, j = col - 1; i >= 0 && j >= 0; i--, j--) if (board[i][j] === 1) return false;
  for (let i = row - 1, j = col + 1; i >= 0 && j < n; i--, j++) if (board[i][j] === 1) return false;
  return true;
};

function generateSteps(input: Record<string, unknown>): StepGeneratorResult {
  const n = input.n as number;
  const board = createBoard(n);
  const ctx = createTraceContext();
  const makeNode = createNodeFactory("solve");
  const { pushCall, pushReturn } = createStepPushers(ctx);
  const rootTree: TreeNode = makeNode(ctx, "row=0");

  function solve(row: number, parentNode: TreeNode, path: string[]): void {
    const node = makeNode(ctx, `row=${row}`);
    attachToParent(parentNode, node);
    const currentPath = extendPath(path, node.id);
    const queens = () => countInMatrix(board, 1);
    const snapshot = () => ({
      row,
      n,
      board: cloneBoard(board),
      queensPlaced: queens(),
      depth: currentPath.length - 1,
    });

    pushCall(LINE.functionDef, node.id, currentPath, snapshot(), `solve(row=${row}) 호출`);

    if (row === n) {
      pushCall(LINE.addSolution, node.id, currentPath, snapshot(), `해 발견! ${queens()}개 퀸 배치 완료`);
      node.status = "completed";
      pushReturn(LINE.baseReturn, node.id, currentPath, snapshot(), `solve(row=${row}) 리턴 (해 찾음)`);
      return;
    }

    let foundAny = false;
    for (let col = 0; col < n; col++) {
      const safe = isSafe(board, row, col, n);
      pushCall(
        safe ? LINE.placeQueen : LINE.safeCheck,
        node.id,
        currentPath,
        { ...snapshot(), col, safe },
        safe ? `(${row},${col})에 퀸 배치` : `(${row},${col}) 충돌 - 건너뜀`
      );

      if (safe) {
        foundAny = true;
        board[row][col] = 1;
        solve(row + 1, node, currentPath);
        pushCall(
          LINE.removeQueen,
          node.id,
          currentPath,
          { ...snapshot(), col },
          `(${row},${col})에서 퀸 제거 (백트래킹)`
        );
        board[row][col] = 0;
      }
    }

    node.status = foundAny ? "completed" : "backtracked";
    pushReturn(LINE.functionDef, node.id, path, snapshot(), `solve(row=${row}) 리턴${!foundAny ? " (백트래킹)" : ""}`);
  }

  solve(0, rootTree, []);
  return { steps: ctx.steps, tree: rootTree };
}

export const nQueenMeta: AlgorithmMeta = {
  id: "n-queen",
  name: "N-Queen",
  description: "N x N 체스판에 N개의 퀸을 서로 공격하지 않게 배치합니다",
  difficulty: "medium",
  code: CODE,
  inputConfig: { type: "single", label: "N 입력", defaults: { n: 4 }, constraints: { min: 4, max: 8 } },
  isPremium: false,
};

export const nQueenGenerator = generateSteps;
