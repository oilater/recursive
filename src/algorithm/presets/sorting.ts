import type { PresetAlgorithm } from "../types";
import { loadCode } from "./load-code";

export const sortingPresets: PresetAlgorithm[] = [
  {
    id: "bubble-sort",
    name: "버블 정렬 (Bubble Sort)",
    description: "인접한 두 원소를 비교하며 정렬합니다",
    difficulty: "easy",
    category: "sorting",
    defaultArgs: [[5, 3, 8, 1, 2]],
    code: loadCode("bubble-sort.js"),
  },
  {
    id: "selection-sort",
    name: "선택 정렬 (Selection Sort)",
    description: "가장 작은 원소를 찾아 앞으로 보냅니다",
    difficulty: "easy",
    category: "sorting",
    defaultArgs: [[5, 3, 8, 1, 2]],
    code: loadCode("selection-sort.js"),
  },
  {
    id: "insertion-sort",
    name: "삽입 정렬 (Insertion Sort)",
    description: "원소를 올바른 위치에 삽입하며 정렬합니다",
    difficulty: "easy",
    category: "sorting",
    defaultArgs: [[5, 3, 8, 1, 2]],
    code: loadCode("insertion-sort.js"),
  },
  {
    id: "quick-sort",
    name: "퀵 정렬 (Quick Sort)",
    description: "피벗을 기준으로 분할하여 재귀적으로 정렬합니다",
    difficulty: "medium",
    category: "sorting",
    defaultArgs: [[5, 3, 8, 1, 2]],
    code: loadCode("quick-sort.js"),
  },
  {
    id: "merge-sort",
    name: "병합 정렬 (Merge Sort)",
    description: "배열을 반으로 나누고 합치며 정렬합니다",
    difficulty: "medium",
    category: "sorting",
    defaultArgs: [[5, 3, 8, 1, 2]],
    code: loadCode("merge-sort.js"),
  },
];
