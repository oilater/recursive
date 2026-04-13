import type { StepGeneratorResult } from "@/entities/algorithm/model/types";

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
  /** 진입 함수 (사용자에게 인자를 요청할 함수) */
  entryFuncName: string;
  entryParamNames: string[];
  /** 재귀 함수 (있으면). 없으면 null → 비재귀 모드 */
  recursiveFuncName: string | null;
  recursiveParamNames: string[];
  /** 추적할 메인 함수의 라인 범위 */
  tracedFuncStartLine: number;
  tracedFuncEndLine: number;
  localVarNames: string[];
  hasRecursion: boolean;
  lineOffset: number;
  /** 원본 코드의 최상위 함수명 (있으면). Worker에서 __entry__ 실행 후 이 함수를 호출 */
  userTopLevelFuncName: string | null;
}

export interface ExecuteOptions {
  timeoutMs?: number;
  maxCalls?: number;
  maxLoopIterations?: number;
}
