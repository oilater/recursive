import type { StepGeneratorResult } from "@/algorithm/types";
import type { ExecuteOptions, AnalysisResult } from "./types";
import { analyzeCode } from "./analyzer";
import { transformCode } from "./transformer";
import { buildWorkerCode } from "./build-worker-code";

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_CALLS = 5000;
const DEFAULT_MAX_LOOP_ITERATIONS = 100000;

export interface ExecuteResult {
  result: StepGeneratorResult;
  analysis: AnalysisResult;
  finalReturnValue?: unknown;
  consoleLogs?: Array<{ text: string; stepIdx: number }>;
}

export async function executeCustomCode(code: string, args: unknown[], options: ExecuteOptions = {}): Promise<ExecuteResult> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, maxCalls = DEFAULT_MAX_CALLS, maxLoopIterations = DEFAULT_MAX_LOOP_ITERATIONS } = options;

  const { analysis, strippedCode } = analyzeCode(code);
  const transformedCode = transformCode(strippedCode, analysis);

  return new Promise<ExecuteResult>((resolve, reject) => {
    const blob = new Blob([buildWorkerCode()], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    URL.revokeObjectURL(url);

    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error(`실행 시간이 ${timeoutMs / 1000}초를 초과했습니다.`));
    }, timeoutMs);

    worker.onmessage = (e) => {
      clearTimeout(timer);
      worker.terminate();
      const response = e.data;
      if (response.type === "success") {
        resolve({ result: response.result, analysis, finalReturnValue: response.finalReturnValue, consoleLogs: response.consoleLogs });
      } else {
        reject(new Error(response.message));
      }
    };

    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error(e.message || "알 수 없는 실행 오류가 발생했습니다"));
    };

    worker.postMessage({
      transformedCode,
      entryFuncName: analysis.entryFuncName,
      hasRecursion: analysis.hasRecursion,
      recursiveFuncName: analysis.recursiveFuncName,
      recursiveParamNames: analysis.recursiveParamNames,
      args,
      maxCalls,
      maxLoopIterations,
      funcStartLine: analysis.tracedFuncStartLine,
      funcEndLine: analysis.tracedFuncEndLine,
      lineOffset: analysis.lineOffset,
      userTopLevelFuncName: analysis.userTopLevelFuncName,
      originalLineCount: code.split("\n").length,
    });
  });
}
