import * as acorn from "acorn";
import { generate } from "astring";
import type { AnalysisResult } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AstNode = any;

/**
 * 코드를 변환합니다:
 * 1. 추적 대상 함수의 매 statement 앞에 `__traceLine(line, __captureVars())` 삽입
 * 2. 함수 본문 선두에 `var __captureVars = __buildCapture([변수명들])` 삽입
 * 3. 재귀 함수가 있으면 선언 직후 `funcName = __createProxy(funcName)` 삽입
 * 4. 루프에 `__guard()` + 반복마다 루프 라인 traceLine 삽입
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
    let captureInjected = false;

    for (const stmt of node.body) {
      // 루프: guard + body 끝에 루프 라인 trace (반복 시 while/for 라인으로 돌아가는 표시)
      if (isLoopStatement(stmt) && stmt.body?.type === "BlockStatement" && Array.isArray(stmt.body.body)) {
        const loopLine = stmt.loc?.start?.line;
        const loopBackTrace = insideTracedFunc && loopLine ? [createTraceLineCall(loopLine)] : [];
        stmt.body.body = [createGuardCall(), ...stmt.body.body, ...loopBackTrace];
      }

      // 추적 함수 내부: 첫 statement 전에 __captureVars 빌더 삽입
      if (insideTracedFunc && !captureInjected) {
        newBody.push(createCaptureVarsInit(varNames));
        captureInjected = true;
      }

      // 추적 함수 내부면 매 statement 앞에 __traceLine 삽입
      // FunctionDeclaration, EmptyStatement는 제외 (선언 자체는 실행 아님)
      const skipTrace = stmt.type === "FunctionDeclaration" || stmt.type === "EmptyStatement";
      if (insideTracedFunc && stmt.loc?.start?.line && !skipTrace) {
        newBody.push(createTraceLineCall(stmt.loc.start.line));
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
          (node.type === "FunctionDeclaration" &&
            (node.id?.name === tracedFuncName || node.id?.name === "__entry__")) ||
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

/**
 * 함수 본문 선두에 삽입하는 인라인 캡처 함수:
 *
 * var __captureVars = function() {
 *   var __v = {};
 *   try { __v.r = r; } catch(e) {}
 *   try { __v.c = c; } catch(e) {}
 *   try { __v.memo = memo; } catch(e) {}
 *   return __v;
 * };
 *
 * 클로저 스코프에서 실행되므로 모든 로컬 변수에 접근 가능.
 * 선언 전 변수는 try-catch로 개별 처리되어 나머지에 영향 없음.
 */
function createCaptureVarsInit(varNames: string[]): AstNode {
  const tryBlocks: AstNode[] = varNames.map((name) => ({
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
            type: "AssignmentExpression",
            start: 0,
            end: 0,
            operator: "=",
            left: {
              type: "MemberExpression",
              start: 0,
              end: 0,
              object: { type: "Identifier", start: 0, end: 0, name: "__v" },
              property: { type: "Identifier", start: 0, end: 0, name },
              computed: false,
              optional: false,
            },
            right: { type: "Identifier", start: 0, end: 0, name },
          },
        },
      ],
    },
    handler: {
      type: "CatchClause",
      start: 0,
      end: 0,
      param: { type: "Identifier", start: 0, end: 0, name: "__e" },
      body: {
        type: "BlockStatement",
        start: 0,
        end: 0,
        body: [
          {
            type: "ExpressionStatement",
            start: 0,
            end: 0,
            expression: {
              type: "AssignmentExpression",
              start: 0,
              end: 0,
              operator: "=",
              left: {
                type: "MemberExpression",
                start: 0,
                end: 0,
                object: { type: "Identifier", start: 0, end: 0, name: "__v" },
                property: { type: "Identifier", start: 0, end: 0, name },
                computed: false,
                optional: false,
              },
              right: { type: "Literal", start: 0, end: 0, value: "-", raw: '"-"' },
            },
          },
        ],
      },
    },
    finalizer: null,
  }));

  const funcBody: AstNode = {
    type: "BlockStatement",
    start: 0,
    end: 0,
    body: [
      {
        type: "VariableDeclaration",
        start: 0,
        end: 0,
        kind: "var",
        declarations: [
          {
            type: "VariableDeclarator",
            start: 0,
            end: 0,
            id: { type: "Identifier", start: 0, end: 0, name: "__v" },
            init: { type: "ObjectExpression", start: 0, end: 0, properties: [] },
          },
        ],
      },
      ...tryBlocks,
      {
        type: "ReturnStatement",
        start: 0,
        end: 0,
        argument: { type: "Identifier", start: 0, end: 0, name: "__v" },
      },
    ],
  };

  return {
    type: "VariableDeclaration",
    start: 0,
    end: 0,
    kind: "var",
    declarations: [
      {
        type: "VariableDeclarator",
        start: 0,
        end: 0,
        id: { type: "Identifier", start: 0, end: 0, name: "__captureVars" },
        init: {
          type: "FunctionExpression",
          start: 0,
          end: 0,
          id: null,
          params: [],
          body: funcBody,
          generator: false,
          async: false,
        },
      },
    ],
  };
}

/** __traceLine(lineNumber, __captureVars()) */
function createTraceLineCall(line: number): AstNode {
  return {
    type: "ExpressionStatement",
    start: 0,
    end: 0,
    expression: {
      type: "CallExpression",
      start: 0,
      end: 0,
      callee: { type: "Identifier", start: 0, end: 0, name: "__traceLine" },
      arguments: [
        { type: "Literal", start: 0, end: 0, value: line, raw: String(line) },
        {
          type: "CallExpression",
          start: 0,
          end: 0,
          callee: { type: "Identifier", start: 0, end: 0, name: "__captureVars" },
          arguments: [],
          optional: false,
        },
      ],
      optional: false,
    },
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
