import * as acorn from "acorn";
import { stripTypeScript } from "./strip-types";
import type { AnalysisResult } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AstNode = any; // acorn AST node - using any for simplicity with acorn's loose types

/**
 * AST 노드를 재귀적으로 순회하면서 특정 이름을 호출하는 CallExpression이 있는지 확인
 */
function hasCallTo(node: AstNode, funcName: string): boolean {
  if (!node || typeof node !== "object") return false;

  if (node.type === "CallExpression" && node.callee?.type === "Identifier" && node.callee.name === funcName) {
    return true;
  }

  for (const key of Object.keys(node)) {
    if (key === "type" || key === "start" || key === "end" || key === "loc") continue;
    const val = node[key];
    if (val && typeof val === "object") {
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item === "object" && item.type && hasCallTo(item, funcName)) return true;
        }
      } else if (val.type && hasCallTo(val, funcName)) {
        return true;
      }
    }
  }
  return false;
}

function getParamNames(params: AstNode[]): string[] {
  if (!params) return [];
  return params.map((p: AstNode) => {
    if (p.type === "Identifier") return p.name;
    if (p.type === "AssignmentPattern" && p.left?.type === "Identifier") return p.left.name;
    return "arg";
  });
}

interface FuncInfo {
  name: string;
  params: string[];
  startLine: number;
  endLine: number;
  isRecursive: boolean;
  node: AstNode;
  parent: AstNode | null;
}

/**
 * AST에서 모든 함수를 찾아 반환 (중첩 포함)
 */
function findAllFunctions(node: AstNode, parent: AstNode | null, results: FuncInfo[]): void {
  if (!node || typeof node !== "object") return;

  // FunctionDeclaration
  if (node.type === "FunctionDeclaration" && node.id?.name) {
    const name = node.id.name;
    results.push({
      name,
      params: getParamNames(node.params),
      startLine: node.loc?.start?.line ?? 1,
      endLine: node.loc?.end?.line ?? 1,
      isRecursive: hasCallTo(node.body, name),
      node,
      parent,
    });
    // 내부 함수도 찾기
    findAllFunctions(node.body, node, results);
    return;
  }

  // VariableDeclarator with function expression / arrow
  if (
    node.type === "VariableDeclarator" &&
    node.id?.type === "Identifier" &&
    node.init &&
    (node.init.type === "FunctionExpression" || node.init.type === "ArrowFunctionExpression")
  ) {
    const name = node.id.name;
    const funcNode = node.init;
    results.push({
      name,
      params: getParamNames(funcNode.params),
      startLine: (node as AstNode).loc?.start?.line ?? 1,
      endLine: (node as AstNode).loc?.end?.line ?? 1,
      isRecursive: hasCallTo(funcNode.body, name),
      node: funcNode,
      parent,
    });
    findAllFunctions(funcNode.body, funcNode, results);
    return;
  }

  // Recurse into child nodes
  for (const key of Object.keys(node)) {
    if (key === "type" || key === "start" || key === "end" || key === "loc") continue;
    const val = node[key];
    if (val && typeof val === "object") {
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item === "object" && item.type) {
            findAllFunctions(item, node, results);
          }
        }
      } else if (val.type) {
        findAllFunctions(val, node, results);
      }
    }
  }
}

/**
 * 사용자 코드를 분석하여 재귀 함수와 진입점 정보를 반환합니다.
 *
 * 지원 패턴:
 * 1. 단일 재귀 함수: function fib(n) { ... fib(n-1) ... }
 * 2. 중첩 재귀: function exist(board, word) { function backtrack(r,c,d) { ... backtrack(...) ... } }
 * 3. 화살표/표현식: const fib = (n) => { ... fib(n-1) ... }
 * 4. TypeScript 코드 (타입 자동 제거)
 */
export interface AnalyzeCodeResult {
  analysis: AnalysisResult;
  strippedCode: string;
}

export function analyzeCode(code: string): AnalyzeCodeResult {
  // 1. TypeScript 타입 제거
  const strippedCode = stripTypeScript(code);

  // 2. 파싱
  let ast: AstNode;
  try {
    ast = acorn.parse(strippedCode, {
      ecmaVersion: 2022,
      sourceType: "script",
      locations: true,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`구문 오류: ${msg}`);
  }

  // 3. 모든 함수 탐지
  const allFunctions: FuncInfo[] = [];
  findAllFunctions(ast, null, allFunctions);

  // 4. 재귀 함수 찾기
  const recursiveFuncs = allFunctions.filter((f) => f.isRecursive);

  if (recursiveFuncs.length === 0) {
    throw new Error("재귀 함수를 찾을 수 없습니다. 함수가 자기 자신을 호출하는지 확인해주세요.");
  }

  // 첫 번째 재귀 함수 선택
  const recursiveFunc = recursiveFuncs[0];

  // 5. 진입점 함수 탐지
  // 재귀 함수가 다른 함수 안에 중첩되어 있는지 확인
  const topLevelFuncs = allFunctions.filter((f) => {
    // 최상위 함수 = body의 parent가 Program인 함수
    const body = ast.body as AstNode[];
    return body.some((stmt: AstNode) => {
      if (stmt.type === "FunctionDeclaration" && stmt.id?.name === f.name) return true;
      if (stmt.type === "VariableDeclaration") {
        return stmt.declarations?.some((d: AstNode) => d.id?.name === f.name);
      }
      return false;
    });
  });

  // 재귀 함수가 최상위인지, 아니면 다른 함수 안에 있는지
  const isTopLevel = topLevelFuncs.some((f) => f.name === recursiveFunc.name);

  let entryFuncName: string | null = null;
  let entryParamNames: string[] = [];

  if (!isTopLevel) {
    // 재귀 함수를 감싸는 최상위 함수 찾기
    const containerFunc = topLevelFuncs.find((f) => hasCallTo(f.node.body || f.node, recursiveFunc.name));
    if (containerFunc) {
      entryFuncName = containerFunc.name;
      entryParamNames = containerFunc.params;
    }
  }

  const userFacingFuncName = entryFuncName ?? recursiveFunc.name;
  const userFacingParamNames = entryFuncName ? entryParamNames : recursiveFunc.params;

  return {
    strippedCode,
    analysis: {
      recursiveFuncName: recursiveFunc.name,
      recursiveParamNames: recursiveFunc.params,
      recursiveStartLine: recursiveFunc.startLine,
      recursiveEndLine: recursiveFunc.endLine,
      entryFuncName,
      entryParamNames,
      userFacingFuncName,
      userFacingParamNames,
    },
  };
}
