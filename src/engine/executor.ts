import type { StepGeneratorResult } from "@/algorithm/types";
import type { ExecuteOptions, AnalysisResult } from "./types";
import { analyzeCode } from "./analyzer";
import { transformCode } from "./transformer";
import type {
  JsWorkerInboundMessage,
  JsWorkerOutboundMessage,
} from "./javascript/worker-types";
import {
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_CALLS,
  DEFAULT_MAX_LOOP_ITERATIONS,
  DEFAULT_MAX_STEPS,
} from "./constants";

export interface ExecuteResult {
  result: StepGeneratorResult;
  analysis: AnalysisResult;
  finalReturnValue?: unknown;
  consoleLogs?: Array<{ text: string; stepIdx: number }>;
}

export async function executeCustomCode(
  code: string,
  args: unknown[],
  options: ExecuteOptions = {},
): Promise<ExecuteResult> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxCalls = DEFAULT_MAX_CALLS,
    maxLoopIterations = DEFAULT_MAX_LOOP_ITERATIONS,
    maxSteps = DEFAULT_MAX_STEPS,
  } = options;

  const { analysis, strippedCode } = analyzeCode(code);
  const transformedCode = transformCode(strippedCode, analysis);

  return new Promise<ExecuteResult>((resolve, reject) => {
    // Webpack static-analyses this exact `new URL(..., import.meta.url)` form —
    // it must be a literal expression passed directly to `new Worker(...)`.
    // Do not factor the URL out to a variable; bundling will break.
    const worker = new Worker(
      new URL("./javascript/worker.ts", import.meta.url),
      { type: "module" },
    );

    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error(`Execution timed out after ${timeoutMs / 1000} seconds.`));
    }, timeoutMs);

    worker.onmessage = (e: MessageEvent<JsWorkerOutboundMessage>) => {
      clearTimeout(timer);
      worker.terminate();
      const response = e.data;
      if (response.type === "success") {
        resolve({
          result: response.result,
          analysis,
          finalReturnValue: response.finalReturnValue,
          consoleLogs: response.consoleLogs,
        });
      } else {
        reject(new Error(response.message));
      }
    };

    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error(e.message || "An unknown execution error occurred."));
    };

    const message: JsWorkerInboundMessage = {
      transformedCode,
      entryFuncName: analysis.entryFuncName,
      hasRecursion: analysis.hasRecursion,
      recursiveFuncName: analysis.recursiveFuncName,
      recursiveParamNames: analysis.recursiveParamNames,
      args,
      maxCalls,
      maxLoopIterations,
      maxSteps,
      lineOffset: analysis.lineOffset,
      userTopLevelFuncName: analysis.userTopLevelFuncName,
      entryOwnVarNames: analysis.entryOwnVarNames,
      originalLineCount: code.split("\n").length,
    };
    worker.postMessage(message);
  });
}
