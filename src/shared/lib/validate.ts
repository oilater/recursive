import { uniq } from "es-toolkit";

export const hasDuplicates = (arr: number[]): boolean => uniq(arr).length !== arr.length;

export const allPositiveIntegers = (arr: number[]): boolean => arr.every((n) => Number.isInteger(n) && n >= 1);

export const parseNumberArray = (input: string): number[] | null => {
  const parts = input
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.some(isNaN) || parts.length === 0) return null;
  return parts;
};

export const safeJsonParse = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};
