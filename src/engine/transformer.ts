import * as acorn from "acorn";
import { generate } from "astring";
import type { AnalysisResult } from "./types";
import {
  id,
  literal,
  call,
  assign,
  member,
  expr,
  block,
  varDecl,
  tryCatch,
  ret,
  funcExpr,
  obj,
} from "./ast-builders";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AstNode = any;

const LOOP_TYPES = [
  "ForStatement",
  "WhileStatement",
  "DoWhileStatement",
  "ForInStatement",
  "ForOfStatement",
];

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
  insideTracedFunc: boolean,
): void {
  if (!node || typeof node !== "object") return;

  if (Array.isArray(node.body)) {
    const newBody: AstNode[] = [];
    let captureInjected = false;

    for (const stmt of node.body) {
      if (isLoop(stmt) && stmt.body?.type === "BlockStatement" && Array.isArray(stmt.body.body)) {
        const loopLine = stmt.loc?.start?.line;
        const loopBackTrace = insideTracedFunc && loopLine ? [traceLineCall(loopLine)] : [];
        stmt.body.body = [guardCall(), ...stmt.body.body, ...loopBackTrace];
      }

      if (insideTracedFunc && !captureInjected) {
        newBody.push(captureVarsInit(varNames));
        captureInjected = true;
      }

      const skipTrace = stmt.type === "FunctionDeclaration" || stmt.type === "EmptyStatement";
      if (insideTracedFunc && stmt.loc?.start?.line && !skipTrace) {
        newBody.push(traceLineCall(stmt.loc.start.line));
      }

      newBody.push(stmt);

      if (recursiveFuncName) {
        if (stmt.type === "FunctionDeclaration" && stmt.id?.name === recursiveFuncName) {
          newBody.push(proxyReassignment(recursiveFuncName));
        }
        if (stmt.type === "VariableDeclaration" && stmt.declarations) {
          for (const decl of stmt.declarations) {
            if (
              decl.id?.name === recursiveFuncName &&
              decl.init &&
              (decl.init.type === "FunctionExpression" ||
                decl.init.type === "ArrowFunctionExpression")
            ) {
              newBody.push(proxyReassignment(recursiveFuncName));
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
              (d.init?.type === "FunctionExpression" || d.init?.type === "ArrowFunctionExpression"),
          ));

      walkAndTransform(
        stmt,
        tracedFuncName,
        recursiveFuncName,
        varNames,
        insideTracedFunc || !!enteringTracedFunc,
      );
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
          if (item?.type)
            walkAndTransform(item, tracedFuncName, recursiveFuncName, varNames, insideTracedFunc);
        }
      } else if (val.type) {
        const isFuncBody =
          (node.type === "FunctionDeclaration" &&
            (node.id?.name === tracedFuncName || node.id?.name === "__entry__")) ||
          node.type === "FunctionExpression" ||
          node.type === "ArrowFunctionExpression";
        walkAndTransform(
          val,
          tracedFuncName,
          recursiveFuncName,
          varNames,
          insideTracedFunc || (isFuncBody && key === "body"),
        );
      }
    }
  }
}

const isLoop = (node: AstNode): boolean => LOOP_TYPES.includes(node.type);

function captureVarsInit(varNames: string[]): AstNode {
  const tryBlocks = varNames.map((name) =>
    tryCatch(
      [expr(assign(member(id("__v"), id(name)), id(name)))],
      [expr(assign(member(id("__v"), id(name)), literal("-")))],
    ),
  );

  return varDecl(
    "__captureVars",
    funcExpr([], block([varDecl("__v", obj()), ...tryBlocks, ret(id("__v"))])),
  );
}

function traceLineCall(line: number): AstNode {
  return expr(call(id("__traceLine"), [literal(line), call(id("__captureVars"))]));
}

function proxyReassignment(funcName: string): AstNode {
  return expr(assign(id(funcName), call(id("__createProxy"), [id(funcName)])));
}

function guardCall(): AstNode {
  return expr(call(id("__guard")));
}
