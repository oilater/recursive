import * as acorn from "acorn";
import { generate } from "astring";
import type { AnalysisResult } from "../types";
import { ENTRY_FUNC_NAME, CREATE_PROXY } from "../constants";
import { id, literal, block, ret } from "../ast-builders";
import { FUNCTION_NODE_TYPES as FUNC_TYPES, extractParamNames } from "../ast-queries";
import {
  type ParentInfo,
  collectUserFuncNames,
  collectOwnVarNames,
  collectVisibleVarNames,
  determineFuncName,
} from "./scope";
import {
  traceLineCall,
  paramArrayLiteral,
  closureCaptureExpr,
  proxyReassignment,
  guardCall,
} from "./emission";
import { wrapAllReturns } from "./return-wrapping";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AstNode = any;

const LOOP_TYPES = [
  "ForStatement",
  "WhileStatement",
  "DoWhileStatement",
  "ForInStatement",
  "ForOfStatement",
];

export function transformCode(strippedCode: string, _analysis: AnalysisResult): string {
  const ast = acorn.parse(strippedCode, {
    ecmaVersion: 2022,
    sourceType: "script",
    locations: true,
  }) as AstNode;
  const userFuncs = collectUserFuncNames(ast);
  walkAndTransform(ast, [], null);
  wrapAllReturns(ast, [], userFuncs);
  return generate(ast);
}

function walkAndTransform(
  node: AstNode,
  enclosingFuncs: AstNode[],
  parentInfo: ParentInfo | null,
): void {
  if (!node || typeof node !== "object" || node.__synthetic) return;

  if (
    node.type === "ArrowFunctionExpression" &&
    node.body &&
    node.body.type !== "BlockStatement"
  ) {
    const exprLoc = node.body.loc;
    const retStmt = ret(node.body);
    if (exprLoc) retStmt.loc = exprLoc;
    node.body = block([retStmt]);
  }

  const isFuncWithBlock = FUNC_TYPES.includes(node.type) && node.body?.type === "BlockStatement";
  if (isFuncWithBlock && !node.__synthetic && !node.__funcName) {
    node.__funcName = determineFuncName(node, parentInfo, enclosingFuncs);
  }
  const nextEnclosing = isFuncWithBlock ? [...enclosingFuncs, node] : enclosingFuncs;

  if (Array.isArray(node.body)) {
    transformBlockBody(node, enclosingFuncs);
    for (const stmt of node.body) walkAndTransform(stmt, nextEnclosing, null);
    return;
  }

  for (const key of Object.keys(node)) {
    if (["type", "start", "end", "loc"].includes(key)) continue;
    const val = node[key];
    if (val && typeof val === "object") {
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item?.type) walkAndTransform(item, nextEnclosing, { parent: node, key });
        }
      } else if (val.type) {
        walkAndTransform(val, nextEnclosing, { parent: node, key });
      }
    }
  }

  if (
    (node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") &&
    !node.__synthetic
  ) {
    const funcName = node.__funcName ?? determineFuncName(node, parentInfo, enclosingFuncs);
    if (funcName !== ENTRY_FUNC_NAME) {
      wrapInPlace(node, funcName, enclosingFuncs);
    }
  }
}

function transformBlockBody(node: AstNode, enclosingFuncs: AstNode[]): void {
  const enclosingFunc = enclosingFuncs[enclosingFuncs.length - 1] ?? null;
  const isFuncBody =
    enclosingFunc !== null && enclosingFunc.body === node && !enclosingFunc.__bodyTransformed;
  const visibleVars = enclosingFunc !== null ? collectVisibleVarNames(enclosingFuncs) : [];

  const newBody: AstNode[] = [];

  for (const stmt of node.body) {
    if (isLoop(stmt) && stmt.body?.type === "BlockStatement" && Array.isArray(stmt.body.body)) {
      const loopLine = stmt.loc?.start?.line;
      const loopBackTrace =
        enclosingFunc !== null && loopLine ? [traceLineCall(loopLine, visibleVars)] : [];
      stmt.body.body = [guardCall(), ...stmt.body.body, ...loopBackTrace];
    }

    const skipTrace = stmt.type === "FunctionDeclaration" || stmt.type === "EmptyStatement";
    if (enclosingFunc !== null && stmt.loc?.start?.line && !skipTrace) {
      newBody.push(traceLineCall(stmt.loc.start.line, visibleVars));
    }

    newBody.push(stmt);

    if (
      stmt.type === "FunctionDeclaration" &&
      stmt.id?.name &&
      stmt.id.name !== ENTRY_FUNC_NAME
    ) {
      newBody.push(
        proxyReassignment(stmt.id.name, extractParamNames(stmt.params), collectOwnVarNames(stmt), enclosingFuncs),
      );
    }
  }

  if (isFuncBody && newBody.length > 0) {
    const lastStmt = node.body[node.body.length - 1];
    const lastLine = lastStmt?.loc?.end?.line ?? lastStmt?.loc?.start?.line;
    if (lastLine) newBody.push(traceLineCall(lastLine, visibleVars));
    enclosingFunc!.__bodyTransformed = true;
  }

  node.body = newBody;
}

const isLoop = (n: AstNode): boolean => LOOP_TYPES.includes(n.type);

function wrapInPlace(node: AstNode, funcName: string, enclosingFuncs: AstNode[]): void {
  const params = node.params || [];
  const paramNames = extractParamNames(params);
  const ownVars = collectOwnVarNames(node);

  const original: Record<string, unknown> = {};
  for (const k of Object.keys(node)) {
    if (k === "__synthetic") continue;
    original[k] = node[k];
  }

  for (const k of Object.keys(node)) {
    if (k === "start" || k === "end" || k === "loc") continue;
    delete (node as Record<string, unknown>)[k];
  }

  node.type = "CallExpression";
  node.callee = id(CREATE_PROXY);
  node.arguments = [
    original,
    literal(funcName),
    paramArrayLiteral(paramNames),
    paramArrayLiteral(ownVars),
    closureCaptureExpr(enclosingFuncs),
  ];
  node.optional = false;
  node.__synthetic = true;
}

