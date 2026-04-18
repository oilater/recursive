import type { CodeLanguage } from "./types";
import type { ExecuteCodeResult } from "./execute";
import type { ExecuteResult } from "./executor";
import type { AnalyzeCodeResult } from "./analyzer";

let executePromise: Promise<typeof import("./execute")> | null = null;
let executorPromise: Promise<typeof import("./executor")> | null = null;
let analyzerPromise: Promise<typeof import("./analyzer")> | null = null;

function loadExecute() {
  if (!executePromise) executePromise = import("./execute");
  return executePromise;
}

function loadExecutor() {
  if (!executorPromise) executorPromise = import("./executor");
  return executorPromise;
}

function loadAnalyzer() {
  if (!analyzerPromise) analyzerPromise = import("./analyzer");
  return analyzerPromise;
}

export async function executeCodeLazy(
  code: string,
  args: unknown[],
  codeLanguage?: CodeLanguage,
): Promise<ExecuteCodeResult> {
  const { executeCode } = await loadExecute();
  return executeCode(code, args, codeLanguage);
}

export async function executeCustomCodeLazy(
  code: string,
  args: unknown[],
): Promise<ExecuteResult> {
  const { executeCustomCode } = await loadExecutor();
  return executeCustomCode(code, args);
}

export async function analyzeCodeLazy(code: string): Promise<AnalyzeCodeResult> {
  const { analyzeCode } = await loadAnalyzer();
  return analyzeCode(code);
}
