import * as acorn from "acorn";
import { generate } from "astring";
import type { AnalysisResult } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AstNode = any;

/**
 * AST를 변환합니다:
 * 1. 재귀 함수 선언 직후에 `funcName = __createProxy(funcName);` 삽입
 * 2. for/while/do-while 루프에 __guard() 삽입
 */
export function transformCode(strippedCode: string, analysis: AnalysisResult): string {
  const ast = acorn.parse(strippedCode, {
    ecmaVersion: 2022,
    sourceType: "script",
    locations: true,
  }) as AstNode;

  const { recursiveFuncName } = analysis;

  walkAndTransform(ast, recursiveFuncName);

  return generate(ast);
}

function walkAndTransform(node: AstNode, funcName: string): void {
  if (!node || typeof node !== "object") return;

  // body 배열이 있으면 프록시 삽입 + 루프 가드 처리
  if (Array.isArray(node.body)) {
    const newBody: AstNode[] = [];
    for (const stmt of node.body) {
      // 루프 가드 삽입
      if (isLoopStatement(stmt) && stmt.body?.type === "BlockStatement" && Array.isArray(stmt.body.body)) {
        stmt.body.body = [createGuardCall(), ...stmt.body.body];
      }

      newBody.push(stmt);

      // 재귀 함수 선언 직후 프록시 삽입
      if (stmt.type === "FunctionDeclaration" && stmt.id?.name === funcName) {
        newBody.push(createProxyReassignment(funcName));
      }
      if (stmt.type === "VariableDeclaration" && stmt.declarations) {
        for (const decl of stmt.declarations) {
          if (
            decl.id?.name === funcName &&
            decl.init &&
            (decl.init.type === "FunctionExpression" || decl.init.type === "ArrowFunctionExpression")
          ) {
            newBody.push(createProxyReassignment(funcName));
          }
        }
      }

      // 각 statement 내부를 재귀 탐색
      walkAndTransform(stmt, funcName);
    }
    node.body = newBody;
    return; // body 배열을 직접 처리했으므로 추가 탐색 불필요
  }

  // body가 배열이 아닌 경우 (예: FunctionDeclaration.body = BlockStatement)
  // 모든 자식 노드를 재귀 탐색
  for (const key of Object.keys(node)) {
    if (key === "type" || key === "start" || key === "end" || key === "loc") continue;
    const val = node[key];
    if (val && typeof val === "object") {
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item === "object" && item.type) {
            walkAndTransform(item, funcName);
          }
        }
      } else if (val.type) {
        walkAndTransform(val, funcName);
      }
    }
  }
}

function isLoopStatement(node: AstNode): boolean {
  return (
    node.type === "ForStatement" ||
    node.type === "WhileStatement" ||
    node.type === "DoWhileStatement" ||
    node.type === "ForInStatement" ||
    node.type === "ForOfStatement"
  );
}

function createProxyReassignment(funcName: string): AstNode {
  return {
    type: "ExpressionStatement",
    start: 0,
    end: 0,
    expression: {
      type: "AssignmentExpression",
      start: 0,
      end: 0,
      operator: "=",
      left: { type: "Identifier", start: 0, end: 0, name: funcName },
      right: {
        type: "CallExpression",
        start: 0,
        end: 0,
        callee: { type: "Identifier", start: 0, end: 0, name: "__createProxy" },
        arguments: [{ type: "Identifier", start: 0, end: 0, name: funcName }],
        optional: false,
      },
    },
  };
}

function createGuardCall(): AstNode {
  return {
    type: "ExpressionStatement",
    start: 0,
    end: 0,
    expression: {
      type: "CallExpression",
      start: 0,
      end: 0,
      callee: { type: "Identifier", start: 0, end: 0, name: "__guard" },
      arguments: [],
      optional: false,
    },
  };
}
