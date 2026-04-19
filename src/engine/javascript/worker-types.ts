import type { StepGeneratorResult } from "@/algorithm/types";

export interface JsWorkerInboundMessage {
  transformedCode: string;
  entryFuncName: string;
  hasRecursion: boolean;
  recursiveFuncName: string | null;
  recursiveParamNames: string[];
  args: unknown[];
  maxCalls: number;
  maxLoopIterations: number;
  maxSteps: number;
  lineOffset: number;
  userTopLevelFuncName: string | null;
  entryOwnVarNames: string[];
  originalLineCount: number;
}

export interface JsWorkerConsoleEntry {
  text: string;
  stepIdx: number;
}

export interface JsWorkerSuccessMessage {
  type: "success";
  result: StepGeneratorResult;
  finalReturnValue: unknown;
  consoleLogs: JsWorkerConsoleEntry[];
}

export interface JsWorkerErrorMessage {
  type: "error";
  message: string;
}

export type JsWorkerOutboundMessage = JsWorkerSuccessMessage | JsWorkerErrorMessage;
