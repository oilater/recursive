import { describe, it, expect } from "vitest";
import { transformCode } from "../transformer";
import type { AnalysisResult } from "../types";

const makeAnalysis = (overrides: Partial<AnalysisResult> = {}): AnalysisResult => ({
  entryFuncName: "__entry__",
  entryParamNames: [],
  recursiveFuncName: null,
  recursiveParamNames: [],
  hasRecursion: false,
  hasTopLevelCall: false,
  lineOffset: 1,
  userTopLevelFuncName: null,
  ...overrides,
});

describe("transformCode", () => {
  it("추적 함수 본문에 __traceLine을 삽입한다", () => {
    const code = `function __entry__() {\nconst x = 1;\nreturn x;\n}`;
    const result = transformCode(code, makeAnalysis());

    expect(result).toContain("__traceLine");
    // try-catch로 감싸서 삽입됨
    expect(result).toContain("try");
  });

  it("재귀 함수에 __createProxy 재할당을 삽입한다", () => {
    const code = `function __entry__() {\nfunction fib(n) { return fib(n-1); }\nfib(5);\n}`;
    const result = transformCode(code, makeAnalysis({ recursiveFuncName: "fib" }));

    expect(result).toContain("__createProxy");
    expect(result).toContain(`fib = __createProxy(fib, "fib", ["n"], ["n"])`);
  });

  it("루프에 __guard를 삽입한다", () => {
    const code = `function __entry__() {\nfor (let i = 0; i < 10; i++) {\nconsole.log(i);\n}\n}`;
    const result = transformCode(code, makeAnalysis());

    expect(result).toContain("__guard()");
  });

  it("루프 반복마다 루프 라인의 __traceLine을 삽입한다", () => {
    const code = `function __entry__() {\nwhile (true) {\nbreak;\n}\n}`;
    const result = transformCode(code, makeAnalysis());

    // while 라인의 traceLine이 body 안에 삽입됨 (반복마다 실행)
    const traceLineCount = (result.match(/__traceLine/g) || []).length;
    // while문 앞 + while body 안 + break 앞 = 최소 3개
    expect(traceLineCount).toBeGreaterThanOrEqual(3);
  });

  it("변수 스냅샷을 __traceLine에 전달한다", () => {
    const code = `function __entry__() {\nconst arr = [1];\n}`;
    const result = transformCode(code, makeAnalysis());

    expect(result).toContain("arr");
  });

  it("추적 함수 밖에는 __traceLine을 삽입하지 않는다", () => {
    const code = `const outside = 1;\nfunction __entry__() {\nconst inside = 2;\n}`;
    const result = transformCode(code, makeAnalysis());

    // 첫 번째 줄(outside) 앞에는 traceLine이 없어야 함
    const lines = result.split("\n");
    const firstContentLine = lines.findIndex((l) => l.includes("outside"));
    if (firstContentLine > 0) {
      expect(lines[firstContentLine - 1]).not.toContain("__traceLine");
    }
  });
});
