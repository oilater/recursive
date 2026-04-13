import type { StepGeneratorResult } from "@/entities/algorithm/model/types";
import type { ExecuteOptions, AnalysisResult } from "../model/types";
import { analyzeCode } from "../model/analyzer";
import { transformCode } from "../model/transformer";
import { buildWorkerCode } from "./build-worker-code";

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_CALLS = 5000;
const DEFAULT_MAX_LOOP_ITERATIONS = 100000;

export interface ExecuteResult {
  result: StepGeneratorResult;
  analysis: AnalysisResult;
  finalReturnValue?: unknown;
}

export async function executeCustomCode(
  code: string,
  args: unknown[],
  options: ExecuteOptions = {}
): Promise<ExecuteResult> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxCalls = DEFAULT_MAX_CALLS,
    maxLoopIterations = DEFAULT_MAX_LOOP_ITERATIONS,
  } = options;

  // 1. 코드 분석 (TS 타입 제거 포함)
  const { analysis, strippedCode } = analyzeCode(code);

  // 2. AST 변환 (재귀 호출 교체, 루프 가드 삽입)
  const transformedCode = transformCode(strippedCode, analysis);

  // 3. Worker 생성 및 실행
  return new Promise<ExecuteResult>((resolve, reject) => {
    const workerScript = buildWorkerCode();
    const blob = new Blob([workerScript], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    URL.revokeObjectURL(url);

    const timer = setTimeout(() => {
      worker.terminate();
      reject(
        new Error(`실행 시간이 ${timeoutMs / 1000}초를 초과했습니다. 무한 루프나 과도한 재귀가 있는지 확인해주세요.`)
      );
    }, timeoutMs);

    worker.onmessage = (e) => {
      clearTimeout(timer);
      worker.terminate();

      const response = e.data;
      if (response.type === "success") {
        resolve({ result: response.result, analysis, finalReturnValue: response.finalReturnValue });
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
      recursiveFuncName: analysis.recursiveFuncName,
      entryFuncName: analysis.entryFuncName,
      args,
      recursiveParamNames: analysis.recursiveParamNames,
      maxCalls,
      maxLoopIterations,
      funcStartLine: analysis.recursiveStartLine,
      funcEndLine: analysis.recursiveEndLine,
    });
  });
}
