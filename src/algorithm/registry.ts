import type { PresetAlgorithm, AlgorithmCardData } from "./types";

const algorithms: PresetAlgorithm[] = [];

export function registerAlgorithm(preset: PresetAlgorithm): void {
  if (algorithms.some((a) => a.id === preset.id)) return;
  algorithms.push(preset);
}

export const getPreset = (id: string): PresetAlgorithm | undefined =>
  algorithms.find((a) => a.id === id);

const toCardData = (a: PresetAlgorithm): AlgorithmCardData => ({
  id: a.id,
  name: a.name,
  description: a.description,
  difficulty: a.difficulty,
  category: a.category,
});

export const getCardDataByCategory = (category: string): AlgorithmCardData[] =>
  algorithms.filter((a) => a.category === category).map(toCardData);
