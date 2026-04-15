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
];
