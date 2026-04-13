/**
 * 코드를 정규화합니다:
 * - 연속 빈 줄을 하나로 압축
 * - 앞뒤 공백 제거
 */
export const normalizeCode = (code: string): string =>
  code
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
