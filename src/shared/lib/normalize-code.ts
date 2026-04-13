/**
 * 코드를 정규화합니다:
 * - 연속 빈 줄을 모두 제거 (내용 있는 줄만 유지)
 * - 앞뒤 공백 제거
 */
export const normalizeCode = (code: string): string =>
  code
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line, i, arr) => {
      // 빈 줄이면: 다음 줄도 빈 줄이면 제거
      if (line.trim() === "") {
        const prev = arr[i - 1]?.trim() ?? "";
        return prev !== ""; // 이전 줄이 비어있지 않을 때만 빈 줄 유지
      }
      return true;
    })
    .join("\n")
    .trim();
