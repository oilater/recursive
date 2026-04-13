import { registerAlgorithm } from "@/entities/algorithm";
import type { AlgorithmMeta } from "@/entities/algorithm";

import { permutationsMeta, permutationsGenerator } from "./permutations";
import { combinationsMeta, combinationsGenerator } from "./combinations";
import { subsetsMeta, subsetsGenerator } from "./subsets";

const freeAlgorithms: Array<{
  meta: AlgorithmMeta;
  generator: (input: Record<string, unknown>) => import("@/entities/algorithm").StepGeneratorResult;
}> = [
  { meta: permutationsMeta, generator: permutationsGenerator },
  { meta: combinationsMeta, generator: combinationsGenerator },
  { meta: subsetsMeta, generator: subsetsGenerator },
];

export function initializeAlgorithms(): void {
  for (const { meta, generator } of freeAlgorithms) {
    registerAlgorithm(meta, generator);
  }
}
