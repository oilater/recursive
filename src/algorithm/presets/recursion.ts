import type { PresetAlgorithm } from "../types";
import { loadCode } from "./load-code";

export const recursionPresets: PresetAlgorithm[] = [
  {
    id: "permutations",
    name: "순열 (Permutations)",
    description: "n개 중 r개를 순서 있게 선택합니다",
    difficulty: "easy",
    category: "recursion",
    defaultArgs: [[1, 2, 3], 2],
    code: loadCode("permutations.js"),
  },
  {
    id: "combinations",
    name: "조합 (Combinations)",
    description: "n개 중 r개를 순서 없이 선택합니다",
    difficulty: "easy",
    category: "recursion",
    defaultArgs: [4, 2],
    code: loadCode("combinations.js"),
  },
  {
    id: "subsets",
    name: "부분집합 (Subsets)",
    description: "주어진 배열의 모든 부분집합을 구합니다",
    difficulty: "easy",
    category: "recursion",
    defaultArgs: [[1, 2, 3]],
    code: loadCode("subsets.js"),
  },
];
