import type { StepGeneratorResult } from "@/algorithm/types";

export interface ExecuteSuccessResponse {
  type: "success";
  result: StepGeneratorResult;
}

export interface ExecuteErrorResponse {
  type: "error";
  message: string;
}

export type ExecuteResponse = ExecuteSuccessResponse | ExecuteErrorResponse;

export interface AnalysisResult {
  entryFuncName: string;
  entryParamNames: string[];
  recursiveFuncName: string | null;
  recursiveParamNames: string[];
  tracedFuncStartLine: number;
  tracedFuncEndLine: number;
  localVarNames: string[];
  hasRecursion: boolean;
  lineOffset: number;
  userTopLevelFuncName: string | null;
}

export interface ExecuteOptions {
  timeoutMs?: number;
  maxCalls?: number;
  maxLoopIterations?: number;
}
