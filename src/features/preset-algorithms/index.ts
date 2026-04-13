import { registerAlgorithm } from "@/entities/algorithm";
import type { AlgorithmMeta } from "@/entities/algorithm";

import { permutationsMeta, permutationsGenerator } from "./permutations";
import { combinationsMeta, combinationsGenerator } from "./combinations";
import { subsetsMeta, subsetsGenerator } from "./subsets";
import { nQueenMeta, nQueenGenerator } from "./n-queen";

// ── 무료 알고리즘: 메타 + stepGenerator 명시적 등록 ──

const freeAlgorithms: Array<{
  meta: AlgorithmMeta;
  generator: (input: Record<string, unknown>) => import("@/entities/algorithm").StepGeneratorResult;
}> = [
  { meta: permutationsMeta, generator: permutationsGenerator },
  { meta: combinationsMeta, generator: combinationsGenerator },
  { meta: subsetsMeta, generator: subsetsGenerator },
  { meta: nQueenMeta, generator: nQueenGenerator },
];

// ── Premium placeholder 알고리즘: 메타만 등록 (stepGenerator 없음) ──

const premiumAlgorithms: AlgorithmMeta[] = [
  {
    id: "merge-sort",
    name: "머지소트 (Merge Sort)",
    description: "분할정복으로 배열을 정렬합니다",
    difficulty: "medium",
    code: "",
    inputConfig: { type: "array", label: "", defaults: {}, constraints: {} },
    isPremium: true,
  },
  {
    id: "quick-sort",
    name: "퀵소트 (Quick Sort)",
    description: "피벗을 기준으로 분할정복 정렬합니다",
    difficulty: "medium",
    code: "",
    inputConfig: { type: "array", label: "", defaults: {}, constraints: {} },
    isPremium: true,
  },
  {
    id: "sudoku",
    name: "스도쿠 (Sudoku)",
    description: "백트래킹으로 스도쿠를 풀이합니다",
    difficulty: "hard",
    code: "",
    inputConfig: { type: "array", label: "", defaults: {}, constraints: {} },
    isPremium: true,
  },
];

/**
 * 모든 알고리즘을 레지스트리에 등록합니다.
 * 이 함수를 한 번 호출하면 side-effect import 불필요.
 */
export function initializeAlgorithms(): void {
  for (const { meta, generator } of freeAlgorithms) {
    registerAlgorithm(meta, generator);
  }
  for (const meta of premiumAlgorithms) {
    registerAlgorithm(meta);
  }
}
