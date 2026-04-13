import * as acorn from "acorn";
import { stripTypeScript } from "./strip-types";
import type { AnalysisResult } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AstNode = any;

// ── AST 유틸 ──

function findInAst(node: AstNode, predicate: (n: AstNode) => boolean): AstNode | null {
  if (!node || typeof node !== "object") return null;
  if (predicate(node)) return node;
  for (const key of Object.keys(node)) {
    if (["type", "start", "end", "loc"].includes(key)) continue;
    const val = node[key];
    if (!val || typeof val !== "object") continue;
    for (const child of Array.isArray(val) ? val : [val]) {
      if (!child?.type) continue;
      const found = findInAst(child, predicate);
      if (found) return found;
    }
  }
  return null;
}

function collectInAst(node: AstNode, predicate: (n: AstNode) => boolean): AstNode[] {
  const results: AstNode[] = [];
  (function walk(n: AstNode) {
    if (!n || typeof n !== "object") return;
    if (predicate(n)) results.push(n);
    for (const key of Object.keys(n)) {
      if (["type", "start", "end", "loc"].includes(key)) continue;
      const val = n[key];
      if (!val || typeof val !== "object") continue;
      for (const child of Array.isArray(val) ? val : [val]) {
        if (child?.type) walk(child);
      }
    }
  })(node);
  return results;
}

const lineOf = (node: AstNode): number => node?.loc?.start?.line ?? 0;

// ── 함수/변수 탐지 ──

interface FuncInfo {
  name: string;
  params: string[];
  startLine: number;
  endLine: number;
  isRecursive: boolean;
  node: AstNode;
}

function extractParamNames(params: AstNode[]): string[] {
  return (params ?? []).map((p: AstNode) => {
    if (p.type === "Identifier") return p.name;
    if (p.type === "AssignmentPattern" && p.left?.type === "Identifier") return p.left.name;
    return "arg";
  });
}

function extractLocalVarNames(funcNode: AstNode): string[] {
  const names = new Set<string>();
  for (const decl of collectInAst(funcNode, (n) => n.type === "VariableDeclarator" && n.id?.type === "Identifier")) {
    names.add(decl.id.name);
  }
  return [...names];
}

function findAllFunctions(ast: AstNode): FuncInfo[] {
  const results: FuncInfo[] = [];

  for (const node of collectInAst(ast, (n) => n.type === "FunctionDeclaration" && !!n.id?.name)) {
    const name = node.id.name;
    results.push({
      name,
      params: extractParamNames(node.params),
      startLine: lineOf(node),
      endLine: node.loc?.end?.line ?? 0,
      isRecursive: !!findInAst(node.body, (n) => n.type === "CallExpression" && n.callee?.name === name),
      node,
    });
  }

  for (const decl of collectInAst(
    ast,
    (n) =>
      n.type === "VariableDeclarator" &&
      n.id?.type === "Identifier" &&
      n.init &&
      (n.init.type === "FunctionExpression" || n.init.type === "ArrowFunctionExpression")
  )) {
    const name = decl.id.name;
    const funcNode = decl.init;
    results.push({
      name,
      params: extractParamNames(funcNode.params),
      startLine: lineOf(decl),
      endLine: decl.loc?.end?.line ?? 0,
      isRecursive: !!findInAst(funcNode.body, (n) => n.type === "CallExpression" && n.callee?.name === name),
      node: funcNode,
    });
  }

  return results;
}

// ── 메인 분석 ──

export interface AnalyzeCodeResult {
  analysis: AnalysisResult;
  strippedCode: string;
}

/**
 * 모든 코드를 항상 `function __entry__() { ... }` 로 래핑합니다.
 * - 함수가 없는 코드 → 그냥 래핑
 * - 최상위 함수가 있는 코드 → 래핑 후 마지막에 호출 안 함 (Worker가 __entry__ 호출)
 * - 중첩 재귀 (exist → backtrack) → 래핑 후 Worker가 __entry__ 호출
 *
 * lineOffset=1 고정 (래핑으로 1줄 밀림). Shiki는 원본 코드로 HTML 생성.
 */
export function analyzeCode(code: string): AnalyzeCodeResult {
  const strippedCode = stripTypeScript(code);

  // 원본 코드 먼저 파싱하여 함수 정보 수집
  let originalAst: AstNode;
  try {
    originalAst = acorn.parse(strippedCode, { ecmaVersion: 2022, sourceType: "script", locations: true });
  } catch (e: unknown) {
    throw new Error(`구문 오류: ${e instanceof Error ? e.message : String(e)}`);
  }

  const originalFunctions = findAllFunctions(originalAst);

  // 항상 __entry__로 래핑. 사용자 함수가 있으면 마지막에 호출.
  const topLevelFunc = originalFunctions.length > 0 ? originalFunctions[0] : null;
  const funcCallLine = topLevelFunc
    ? `\nreturn ${topLevelFunc.name}.apply(null, __args);`
    : "";
  const wrappedCode = `function __entry__() {\n${strippedCode}${funcCallLine}\n}`;
  const wrappedAst = acorn.parse(wrappedCode, { ecmaVersion: 2022, sourceType: "script", locations: true }) as AstNode;
  const wrappedFunctions = findAllFunctions(wrappedAst);

  // __entry__ 함수 정보
  const entryFunc = wrappedFunctions.find((f) => f.name === "__entry__")!;

  // 재귀 함수 탐지 (__entry__ 제외)
  const recursiveFunc = wrappedFunctions.find((f) => f.name !== "__entry__" && f.isRecursive) ?? null;

  // 추적 대상 = __entry__ (모든 코드를 포함)
  const localVarNames = [
    ...new Set([...entryFunc.params, ...extractLocalVarNames(entryFunc.node)]),
  ];

  const userFacingParams = topLevelFunc ? topLevelFunc.params : [];

  return {
    strippedCode: wrappedCode,
    analysis: {
      entryFuncName: "__entry__",
      entryParamNames: userFacingParams,
      recursiveFuncName: recursiveFunc?.name ?? null,
      recursiveParamNames: recursiveFunc?.params ?? [],
      tracedFuncStartLine: entryFunc.startLine,
      tracedFuncEndLine: entryFunc.endLine,
      localVarNames,
      hasRecursion: !!recursiveFunc,
      lineOffset: 1,
      userTopLevelFuncName: topLevelFunc?.name ?? null,
    },
  };
}
