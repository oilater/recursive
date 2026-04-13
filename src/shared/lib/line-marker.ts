/**
 * 코드 문자열에서 `// @line:key` 마커를 파싱하여 { key: lineNumber } 맵을 반환합니다.
 * 마커는 표시용 코드에서 제거됩니다.
 *
 * @example
 * const { lineMap, cleanCode } = parseLineMarkers(`
 *   function solve(row) {  // @line:functionDef
 *     if (row === n) {     // @line:baseCheck
 * `);
 * // lineMap = { functionDef: 2, baseCheck: 3 }
 * // cleanCode = 마커가 제거된 깨끗한 코드
 */

const MARKER_REGEX = /\/\/\s*@line:(\w+)\s*$/;

export interface LineMarkerResult {
  lineMap: Record<string, number>;
  cleanCode: string;
}

export const parseLineMarkers = (code: string): LineMarkerResult => {
  const lineMap: Record<string, number> = {};
  const cleanLines: string[] = [];

  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(MARKER_REGEX);

    if (match) {
      const key = match[1];
      lineMap[key] = i + 1; // 1-indexed
      cleanLines.push(line.replace(MARKER_REGEX, "").trimEnd());
    } else {
      cleanLines.push(line);
    }
  }

  return { lineMap, cleanCode: cleanLines.join("\n") };
};
