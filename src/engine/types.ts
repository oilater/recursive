export interface AnalysisResult {
  entryFuncName: string;
  entryParamNames: string[];
  entryOwnVarNames: string[];
  recursiveFuncName: string | null;
  recursiveParamNames: string[];
  hasRecursion: boolean;
  hasTopLevelCall: boolean;
  lineOffset: number;
  userTopLevelFuncName: string | null;
}

export interface ExecuteOptions {
  timeoutMs?: number;
  maxCalls?: number;
  maxLoopIterations?: number;
  maxSteps?: number;
}

export type CodeLanguage = "javascript" | "python";
