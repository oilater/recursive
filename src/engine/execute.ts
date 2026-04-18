import type { CodeLanguage } from "./types";
import type { ExecuteResult } from "./executor";
import { executeCustomCode } from "./executor";
import { executePython } from "./python";

export interface ExecuteCodeResult {
  result: import("@/algorithm/types").StepGeneratorResult;
  hasRecursion: boolean;
  finalReturnValue?: unknown;
  consoleLogs?: Array<{ text: string; stepIdx: number }>;
}

export async function executeCode(
  code: string,
  args: unknown[],
  codeLanguage: CodeLanguage = "javascript",
): Promise<ExecuteCodeResult> {
  if (codeLanguage === "python") {
    const pyResult = await executePython(code, args);
    return {
      result: pyResult.result,
      hasRecursion: pyResult.hasRecursion,
      finalReturnValue: pyResult.finalReturnValue,
      consoleLogs: pyResult.consoleLogs,
    };
  }

  const jsResult = await executeCustomCode(code, args);
  return {
    result: jsResult.result,
    hasRecursion: jsResult.analysis.hasRecursion,
    finalReturnValue: jsResult.finalReturnValue,
    consoleLogs: jsResult.consoleLogs,
  };
}
