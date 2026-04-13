import type { StepGeneratorResult } from "@/entities/algorithm/model/types";

export interface ExecuteRequest {
  code: string;
  args: unknown[];
  maxCalls: number;
  maxLoopIterations: number;
}

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
  /** 추적할 재귀 함수 이름 */
  recursiveFuncName: string;
  /** 재귀 함수 파라미터 이름 */
  recursiveParamNames: string[];
  /** 재귀 함수 시작/끝 라인 */
  recursiveStartLine: number;
  recursiveEndLine: number;
  /** 진입점 함수 이름 (재귀 함수를 감싸는 외부 함수, 없으면 null) */
  entryFuncName: string | null;
  /** 진입점 함수 파라미터 이름 */
  entryParamNames: string[];
  /** 사용자에게 인자를 요청할 함수명과 파라미터 */
  userFacingFuncName: string;
  userFacingParamNames: string[];
}

export interface ExecuteOptions {
  timeoutMs?: number;
  maxCalls?: number;
  maxLoopIterations?: number;
}
