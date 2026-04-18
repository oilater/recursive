import * as acorn from "acorn";
import { stripTypeScript } from "./strip-types";
import type { AnalysisResult } from "./types";
import { ENTRY_FUNC_NAME } from "./constants";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AstNode = any;

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
    if (predicate(n)) {
      result = n;
      return true;
    }
  });
  return result;
}

function collectInAst(node: AstNode, predicate: (n: AstNode) => boolean): AstNode[] {
  const results: AstNode[] = [];
  walkAst(node, (n) => {
    if (predicate(n)) results.push(n);
  });
  return results;
}

const lineOf = (node: AstNode): number => node?.loc?.start?.line ?? 0;

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

function findAllFunctions(ast: AstNode): FuncInfo[] {
  const results: FuncInfo[] = [];

  for (const node of collectInAst(ast, (n) => n.type === "FunctionDeclaration" && !!n.id?.name)) {
    const name = node.id.name;
    results.push({
      name,
      params: extractParamNames(node.params),
      startLine: lineOf(node),
      endLine: node.loc?.end?.line ?? 0,
      isRecursive: !!findInAst(
        node.body,
        (n) => n.type === "CallExpression" && n.callee?.name === name,
      ),
      node,
    });
  }

  for (const decl of collectInAst(
    ast,
    (n) =>
      n.type === "VariableDeclarator" &&
      n.id?.type === "Identifier" &&
      n.init &&
      (n.init.type === "FunctionExpression" || n.init.type === "ArrowFunctionExpression"),
  )) {
    const name = decl.id.name;
    const funcNode = decl.init;
    results.push({
      name,
      params: extractParamNames(funcNode.params),
      startLine: lineOf(decl),
      endLine: decl.loc?.end?.line ?? 0,
      isRecursive: !!findInAst(
        funcNode.body,
        (n) => n.type === "CallExpression" && n.callee?.name === name,
      ),
      node: funcNode,
    });
  }

  return results;
}

export interface AnalyzeCodeResult {
  analysis: AnalysisResult;
  strippedCode: string;
}

function hasTopLevelCallTo(ast: AstNode, funcName: string): boolean {
  for (const stmt of ast.body ?? []) {
    if (stmt.type === "FunctionDeclaration") continue;
    const found = findInAst(
      stmt,
      (n) =>
        n.type === "CallExpression" &&
        n.callee?.type === "Identifier" &&
        n.callee?.name === funcName,
    );
    if (found) return true;
  }
  return false;
}

export function analyzeCode(code: string): AnalyzeCodeResult {
  const strippedCode = stripTypeScript(code);

  let originalAst: AstNode;
  try {
    originalAst = acorn.parse(strippedCode, {
      ecmaVersion: 2022,
      sourceType: "script",
      locations: true,
    });
  } catch (e: unknown) {
    throw new Error(`Syntax error: ${e instanceof Error ? e.message : String(e)}`);
  }

  const originalFunctions = findAllFunctions(originalAst);

  const topLevelFunc = originalFunctions.length > 0 ? originalFunctions[0] : null;
  const returnRef = topLevelFunc ? `\nreturn ${topLevelFunc.name};` : "";
  const wrappedCode = `function ${ENTRY_FUNC_NAME}() {\n${strippedCode}${returnRef}\n}`;
  const wrappedAst = acorn.parse(wrappedCode, {
    ecmaVersion: 2022,
    sourceType: "script",
    locations: true,
  }) as AstNode;
  const wrappedFunctions = findAllFunctions(wrappedAst);
  const entryFunc = wrappedFunctions.find((f) => f.name === ENTRY_FUNC_NAME);

  const recursiveFunc =
    wrappedFunctions.find((f) => f.name !== ENTRY_FUNC_NAME && f.isRecursive) ?? null;

  const userFacingParams = topLevelFunc ? topLevelFunc.params : [];
  const hasTopLevelCall = topLevelFunc
    ? hasTopLevelCallTo(originalAst, topLevelFunc.name)
    : false;
  const entryOwnVarNames = entryFunc ? collectTopLevelVarNames(entryFunc.node) : [];

  return {
    strippedCode: wrappedCode,
    analysis: {
      entryFuncName: ENTRY_FUNC_NAME,
      entryParamNames: userFacingParams,
      entryOwnVarNames,
      recursiveFuncName: recursiveFunc?.name ?? null,
      recursiveParamNames: recursiveFunc?.params ?? [],
      hasRecursion: !!recursiveFunc,
      hasTopLevelCall,
      lineOffset: 1,
      userTopLevelFuncName: topLevelFunc?.name ?? null,
    },
  };
}

function collectTopLevelVarNames(funcNode: AstNode): string[] {
  const names = new Set<string>();
  if (funcNode.body?.type !== "BlockStatement") return [];
  function walk(n: AstNode) {
    if (!n || typeof n !== "object") return;
    if (n.type === "FunctionDeclaration") {
      if (n.id?.name) names.add(n.id.name);
      return;
    }
    if (n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression") return;
    if (n.type === "VariableDeclarator" && n.id?.type === "Identifier") {
      names.add(n.id.name);
    }
    for (const key of Object.keys(n)) {
      if (["type", "start", "end", "loc"].includes(key)) continue;
      const val = n[key];
      if (val && typeof val === "object") {
        if (Array.isArray(val)) for (const item of val) walk(item);
        else walk(val);
      }
    }
  }
  for (const stmt of funcNode.body.body) walk(stmt);
  return [...names];
}
