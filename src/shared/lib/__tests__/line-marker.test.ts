import { describe, it, expect } from "vitest";
import { parseLineMarkers } from "../line-marker";

describe("parseLineMarkers", () => {
  it("마커를 파싱하여 lineMap을 반환한다", () => {
    const { lineMap, cleanCode } = parseLineMarkers(
      `function solve(row) { // @line:functionDef
  if (row === n) {     // @line:baseCheck
    return;            // @line:baseReturn
  }
}`
    );

    expect(lineMap.functionDef).toBe(1);
    expect(lineMap.baseCheck).toBe(2);
    expect(lineMap.baseReturn).toBe(3);
  });

  it("cleanCode에서 마커를 제거한다", () => {
    const { cleanCode } = parseLineMarkers(`const x = 1; // @line:init`);

    expect(cleanCode).toBe("const x = 1;");
    expect(cleanCode).not.toContain("@line");
  });

  it("마커 없는 코드는 그대로 반환한다", () => {
    const code = "const x = 1;\nconst y = 2;";
    const { lineMap, cleanCode } = parseLineMarkers(code);

    expect(lineMap).toEqual({});
    expect(cleanCode).toBe(code);
  });
});
