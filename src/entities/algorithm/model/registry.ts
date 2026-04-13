import type { AlgorithmMeta, AlgorithmCardData, StepGenerator } from "./types";

/**
 * 직렬화 가능한 메타데이터 (Server/Client 양쪽 사용 가능)
 */
const metaRegistry: AlgorithmMeta[] = [];

/**
 * stepGenerator 함수 맵 (Client에서만 사용)
 */
const generatorMap = new Map<string, StepGenerator>();

// ── 등록 ──

export function registerAlgorithm(meta: AlgorithmMeta, stepGenerator?: StepGenerator): void {
  // 중복 등록 방지
  if (metaRegistry.some((m) => m.id === meta.id)) return;
  metaRegistry.push(meta);
  if (stepGenerator) {
    generatorMap.set(meta.id, stepGenerator);
  }
}

// ── 메타 조회 (직렬화 안전) ──

export const getMeta = (id: string): AlgorithmMeta | undefined => metaRegistry.find((m) => m.id === id);

export const getAllMeta = (): AlgorithmMeta[] => [...metaRegistry];

export const getFreeMeta = (): AlgorithmMeta[] => metaRegistry.filter((m) => !m.isPremium);

export const getPremiumMeta = (): AlgorithmMeta[] => metaRegistry.filter((m) => m.isPremium);

// ── 카드 데이터 (직렬화 안전) ──

const toCardData = (meta: AlgorithmMeta): AlgorithmCardData => ({
  id: meta.id,
  name: meta.name,
  description: meta.description,
  difficulty: meta.difficulty,
  isPremium: meta.isPremium,
});

export const getAllCardData = (): AlgorithmCardData[] => metaRegistry.map(toCardData);

export const getFreeCardData = (): AlgorithmCardData[] => getFreeMeta().map(toCardData);

export const getPremiumCardData = (): AlgorithmCardData[] => getPremiumMeta().map(toCardData);

// ── stepGenerator 조회 (Client 전용) ──

export const getStepGenerator = (id: string): StepGenerator | undefined => generatorMap.get(id);
