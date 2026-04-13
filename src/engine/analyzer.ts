import * as acorn from "acorn";
import { stripTypeScript } from "./strip-types";
import type { AnalysisResult } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AstNode = any;

// ── AST 유틸 ──

function walkAst(node: AstNode, visitor: (n: AstNode) => boolean | void): void {
  if (!node || typeof node !== "object") return;
  if (visitor(node) === true) return; // true = stop
  for (const key of Object.keys(node)) {
    if (["type", "start", "end", "loc"].includes(key)) continue;
    const val = node[key];
    if (!val || typeof val !== "object") continue;
    for (const child of Array.isArray(val) ? val : [val]) {
      if (child?.type) walkAst(child, visitor);
    }
  }
}

function findInAst(node: AstNode, predicate: (n: AstNode) => boolean): AstNode | null {
  let result: AstNode | null = null;
  walkAst(node, (n) => {
    if (predicate(n)) { result = n; return true; }
  });
  return result;
}

function collectInAst(node: AstNode, predicate: (n: AstNode) => boolean): AstNode[] {
  const results: AstNode[] = [];
  walkAst(node, (n) => { if (predicate(n)) results.push(n); });
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

/** 함수 노드 내부의 주요 변수명 추출 (선언 + 명명 함수 파라미터. 콜백 파라미터 제외) */
function extractLocalVarNames(funcNode: AstNode): string[] {
  const names = new Set<string>();

  for (const decl of collectInAst(funcNode, (n) => n.type === "VariableDeclarator" && n.id?.type === "Identifier")) {
    names.add(decl.id.name);
  }

  for (const fn of collectInAst(funcNode, (n) => n.type === "FunctionDeclaration")) {
    for (const param of fn.params ?? []) {
      if (param.type === "Identifier" && param.name !== "_") names.add(param.name);
      if (param.type === "AssignmentPattern" && param.left?.type === "Identifier") names.add(param.left.name);
    }
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

export function analyzeCode(code: string): AnalyzeCodeResult {
  const strippedCode = stripTypeScript(code);

  let originalAst: AstNode;
  try {
    originalAst = acorn.parse(strippedCode, { ecmaVersion: 2022, sourceType: "script", locations: true });
  } catch (e: unknown) {
    throw new Error(`구문 오류: ${e instanceof Error ? e.message : String(e)}`);
  }

  const originalFunctions = findAllFunctions(originalAst);

  const topLevelFunc = originalFunctions.length > 0 ? originalFunctions[0] : null;
  const returnRef = topLevelFunc ? `\nreturn ${topLevelFunc.name};` : "";
  const wrappedCode = `function __entry__() {\n${strippedCode}${returnRef}\n}`;
  const wrappedAst = acorn.parse(wrappedCode, { ecmaVersion: 2022, sourceType: "script", locations: true }) as AstNode;
  const wrappedFunctions = findAllFunctions(wrappedAst);

  const entryFunc = wrappedFunctions.find((f) => f.name === "__entry__")!;

  const recursiveFunc = wrappedFunctions.find((f) => f.name !== "__entry__" && f.isRecursive) ?? null;

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
      tracedFuncStartLine: recursiveFunc?.startLine ?? entryFunc.startLine,
      tracedFuncEndLine: recursiveFunc?.endLine ?? entryFunc.endLine,
      localVarNames,
      hasRecursion: !!recursiveFunc,
      lineOffset: 1,
      userTopLevelFuncName: topLevelFunc?.name ?? null,
    },
  };
}
