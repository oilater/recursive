import * as acorn from "acorn";
import { generate } from "astring";
import type { AnalysisResult } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AstNode = any;

/**
 * 코드를 변환합니다:
 * 1. 추적 대상 함수의 매 statement 앞에 `__traceLine(line, {var1, var2, ...})` 삽입
 * 2. 재귀 함수가 있으면 선언 직후 `funcName = __createProxy(funcName)` 삽입
 * 3. 루프에 `__guard()` 삽입
 */
export function transformCode(strippedCode: string, analysis: AnalysisResult): string {
  const ast = acorn.parse(strippedCode, {
    ecmaVersion: 2022,
    sourceType: "script",
    locations: true,
  }) as AstNode;

  const tracedFuncName = analysis.recursiveFuncName ?? analysis.entryFuncName;
  walkAndTransform(ast, tracedFuncName, analysis.recursiveFuncName, analysis.localVarNames, false);

  return generate(ast);
}

function walkAndTransform(
  node: AstNode,
  tracedFuncName: string,
  recursiveFuncName: string | null,
  varNames: string[],
  insideTracedFunc: boolean
): void {
  if (!node || typeof node !== "object") return;

  if (Array.isArray(node.body)) {
    const newBody: AstNode[] = [];
    for (const stmt of node.body) {
      // 루프 가드 + 반복마다 루프 라인 traceLine 삽입
      if (isLoopStatement(stmt) && stmt.body?.type === "BlockStatement" && Array.isArray(stmt.body.body)) {
        const loopLine = stmt.loc?.start?.line;
        const loopTrace = insideTracedFunc && loopLine ? [createTraceLineCall(loopLine, varNames)] : [];
        stmt.body.body = [createGuardCall(), ...loopTrace, ...stmt.body.body];
      }

      // 추적 함수 내부면 매 statement 앞에 __traceLine 삽입
      if (insideTracedFunc && stmt.loc?.start?.line) {
        newBody.push(createTraceLineCall(stmt.loc.start.line, varNames));
      }

      newBody.push(stmt);

      // 재귀 함수면 프록시 삽입
      if (recursiveFuncName) {
        if (stmt.type === "FunctionDeclaration" && stmt.id?.name === recursiveFuncName) {
          newBody.push(createProxyReassignment(recursiveFuncName));
        }
        if (stmt.type === "VariableDeclaration" && stmt.declarations) {
          for (const decl of stmt.declarations) {
            if (
              decl.id?.name === recursiveFuncName &&
              decl.init &&
              (decl.init.type === "FunctionExpression" || decl.init.type === "ArrowFunctionExpression")
            ) {
              newBody.push(createProxyReassignment(recursiveFuncName));
            }
          }
        }
      }

      // 추적 함수 진입 판단
      const enteringTracedFunc =
        (stmt.type === "FunctionDeclaration" && stmt.id?.name === tracedFuncName) ||
        (stmt.type === "VariableDeclaration" &&
          stmt.declarations?.some(
            (d: AstNode) =>
              d.id?.name === tracedFuncName &&
              (d.init?.type === "FunctionExpression" || d.init?.type === "ArrowFunctionExpression")
          ));

      walkAndTransform(stmt, tracedFuncName, recursiveFuncName, varNames, insideTracedFunc || !!enteringTracedFunc);
    }
    node.body = newBody;
    return;
  }

  for (const key of Object.keys(node)) {
    if (["type", "start", "end", "loc"].includes(key)) continue;
    const val = node[key];
    if (val && typeof val === "object") {
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item?.type) walkAndTransform(item, tracedFuncName, recursiveFuncName, varNames, insideTracedFunc);
        }
      } else if (val.type) {
        const isFuncBody =
          (node.type === "FunctionDeclaration" && node.id?.name === tracedFuncName) ||
          node.type === "FunctionExpression" ||
          node.type === "ArrowFunctionExpression";
        walkAndTransform(val, tracedFuncName, recursiveFuncName, varNames, insideTracedFunc || (isFuncBody && key === "body"));
      }
    }
  }
}

function isLoopStatement(node: AstNode): boolean {
  return ["ForStatement", "WhileStatement", "DoWhileStatement", "ForInStatement", "ForOfStatement"].includes(node.type);
}

/** __traceLine(lineNumber, {var1: var1, var2: var2, ...}) */
function createTraceLineCall(line: number, varNames: string[]): AstNode {
  const varsObject: AstNode = {
    type: "ObjectExpression",
    start: 0,
    end: 0,
    properties: varNames.map((name) => ({
      type: "Property",
      start: 0,
      end: 0,
      method: false,
      shorthand: true,
      computed: false,
      key: { type: "Identifier", start: 0, end: 0, name },
      value: { type: "Identifier", start: 0, end: 0, name },
      kind: "init",
    })),
  };

  return {
    type: "TryStatement",
    start: 0,
    end: 0,
    block: {
      type: "BlockStatement",
      start: 0,
      end: 0,
      body: [
        {
          type: "ExpressionStatement",
          start: 0,
          end: 0,
          expression: {
            type: "CallExpression",
            start: 0,
            end: 0,
            callee: { type: "Identifier", start: 0, end: 0, name: "__traceLine" },
            arguments: [{ type: "Literal", start: 0, end: 0, value: line, raw: String(line) }, varsObject],
            optional: false,
          },
        },
      ],
    },
    handler: {
      type: "CatchClause",
      start: 0,
      end: 0,
      param: null,
      body: { type: "BlockStatement", start: 0, end: 0, body: [] },
    },
    finalizer: null,
  };
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
