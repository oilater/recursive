import type { StepGeneratorResult } from "@/algorithm/types";

// ── Executor ↔ Worker message envelope ──────────────────────────────────

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

// ── Worker runtime globals (injected into user-transformed code) ────────
//
// The transformer emits calls like `__traceLine(...)` and `__createProxy(...)`
// that resolve at runtime against arguments passed into `new Function(...)`.
// These types pin down that contract so worker-side drift is caught by tsc.

export type GuardFn = () => void;

export type TraceLineFn = (
  line: number,
  varsSnapshot: Record<string, unknown> | undefined,
) => void;

export type CaptureClosureFn = () => Record<string, unknown> | null;

/* eslint-disable-next-line @typescript-eslint/no-unsafe-function-type */
export type CreateProxyFn = (
  originalFunc: Function,
  funcName: string,
  paramNames: string[],
  ownVarNames: string[],
  captureClosureFn?: CaptureClosureFn,
  /* eslint-disable-next-line @typescript-eslint/no-unsafe-function-type */
) => Function;

export interface WorkerConsole {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
}

export interface WorkerRuntime {
  __guard: GuardFn;
  __createProxy: CreateProxyFn;
  __traceLine: TraceLineFn;
  __args: unknown[];
  console: WorkerConsole;
}
