import { uniq } from "es-toolkit";

/**
 * 배열에 중복 값이 있는지 확인합니다.
 */
export const hasDuplicates = (arr: number[]): boolean => uniq(arr).length !== arr.length;

/**
 * 모든 값이 양의 정수인지 확인합니다.
 */
export const allPositiveIntegers = (arr: number[]): boolean => arr.every((n) => Number.isInteger(n) && n >= 1);

/**
 * 문자열을 숫자 배열로 파싱합니다.
 */
export const parseNumberArray = (input: string): number[] | null => {
  const parts = input
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(Number);

  if (parts.some(isNaN) || parts.length === 0) return null;
  return parts;
};

/**
 * 안전한 JSON 파싱. 실패 시 원본 문자열 반환.
 */
export const safeJsonParse = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};
