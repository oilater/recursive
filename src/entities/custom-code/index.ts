// model (순수 분석/변환 로직)
export { analyzeCode } from "./model/analyzer";
export { transformCode } from "./model/transformer";
export type { AnalysisResult, ExecuteOptions } from "./model/types";

// lib (인프라 - Worker 실행)
export { executeCustomCode } from "./lib/executor";
export type { ExecuteResult } from "./lib/executor";
