import { registerAlgorithm } from "../registry";
import { recursionPresets } from "./recursion";
import { sortingPresets } from "./sorting";

const allPresets = [...recursionPresets, ...sortingPresets];

export function initializeAlgorithms(): void {
  for (const preset of allPresets) {
    registerAlgorithm(preset);
  }
}
