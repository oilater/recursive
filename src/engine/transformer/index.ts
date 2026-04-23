import * as acorn from "acorn";
import { generate } from "astring";
import type { AnalysisResult } from "../types";
import { ENTRY_FUNC_NAME, TRACE_LINE, CREATE_PROXY, GUARD } from "../constants";
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
} from "../ast-builders";
import { FUNCTION_NODE_TYPES as FUNC_TYPES, extractParamNames } from "../ast-queries";
import { walkChildren, walkFuncBody } from "./traversal";
import {
  type ParentInfo,
  collectUserFuncNames,
  collectVarNamesInFuncs,
  collectOwnVarNames,
  collectVisibleVarNames,
  determineFuncName,
  shouldWrapReturn,
} from "./scope";

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

function wrapAllReturns(
  node: AstNode,
  enclosingFuncs: AstNode[],
  userFuncs: Set<string>,
): void {
  if (!node || typeof node !== "object") return;
  const isFunction =
    FUNC_TYPES.includes(node.type) &&
    node.body?.type === "BlockStatement" &&
    !node.__synthetic;
  const nextEnclosing = isFunction ? [...enclosingFuncs, node] : enclosingFuncs;
  walkChildren(node, (child) => wrapAllReturns(child, nextEnclosing, userFuncs));
  if (isFunction && node.__funcName !== ENTRY_FUNC_NAME) {
    wrapReturnsIn(node.body, collectVisibleVarNames(nextEnclosing), userFuncs);
  }
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

function wrapReturn(retStmt: AstNode, visibleVars: string[]): AstNode {
  const line = retStmt.loc?.start?.line ?? 0;
  const traceCall = traceLineCall(line, visibleVars);
  const body: AstNode[] = [];
  if (retStmt.argument) {
    body.push(varDecl("__ret", retStmt.argument));
    body.push(traceCall);
    body.push(ret(id("__ret")));
  } else {
    body.push(traceCall);
    body.push(markSynthetic({ type: "ReturnStatement", argument: null, start: 0, end: 0 }));
  }
  return markSynthetic(block(body));
}

function wrapReturnsIn(node: AstNode, visibleVars: string[], userFuncs: Set<string>): void {
  if (!node || typeof node !== "object" || node.__synthetic) return;
  if (FUNC_TYPES.includes(node.type)) return;
  for (const key of Object.keys(node)) {
    if (["type", "start", "end", "loc"].includes(key)) continue;
    const val = node[key];
    if (val && typeof val === "object") {
      if (Array.isArray(val)) {
        for (let i = 0; i < val.length; i++) {
          const child = val[i];
          if (
            child?.type === "ReturnStatement" &&
            !child.__synthetic &&
            shouldWrapReturn(child, userFuncs)
          ) {
            val[i] = wrapReturn(child, visibleVars);
          } else {
            wrapReturnsIn(child, visibleVars, userFuncs);
          }
        }
      } else if (
        val.type === "ReturnStatement" &&
        !val.__synthetic &&
        shouldWrapReturn(val, userFuncs)
      ) {
        node[key] = wrapReturn(val, visibleVars);
      } else {
        wrapReturnsIn(val, visibleVars, userFuncs);
      }
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

function markSynthetic(node: AstNode): AstNode {
  node.__synthetic = true;
  return node;
}

function captureVarsExpr(varNames: string[]): AstNode {
  const tryBlocks = varNames.map((name) =>
    tryCatch(
      [expr(assign(member(id("__v"), id(name)), id(name)))],
      [expr(assign(member(id("__v"), id(name)), literal("-")))],
    ),
  );
  return markSynthetic(
    call(funcExpr([], block([varDecl("__v", obj()), ...tryBlocks, ret(id("__v"))])), []),
  );
}

function traceLineCall(line: number, varNames: string[]): AstNode {
  return markSynthetic(expr(call(id(TRACE_LINE), [literal(line), captureVarsExpr(varNames)])));
}

function paramArrayLiteral(paramNames: string[]): AstNode {
  return markSynthetic({
    type: "ArrayExpression",
    elements: paramNames.map((p) => literal(p)),
    start: 0,
    end: 0,
  });
}

function closureCaptureExpr(enclosingFuncs: AstNode[]): AstNode {
  const closureNames = collectVarNamesInFuncs(enclosingFuncs, {
    skipEntryParams: true,
    skipEntryBody: true,
  });

  if (closureNames.size === 0) return markSynthetic(literal(null));

  const tryBlocks = [...closureNames].map((name) =>
    tryCatch(
      [expr(assign(member(id("__v"), id(name)), id(name)))],
      [],
    ),
  );
  return markSynthetic(
    funcExpr([], block([varDecl("__v", obj()), ...tryBlocks, ret(id("__v"))])),
  );
}

function proxyReassignment(
  funcName: string,
  paramNames: string[],
  ownVars: string[],
  enclosingFuncs: AstNode[],
): AstNode {
  return markSynthetic(
    expr(
      assign(
        id(funcName),
        call(id(CREATE_PROXY), [
          id(funcName),
          literal(funcName),
          paramArrayLiteral(paramNames),
          paramArrayLiteral(ownVars),
          closureCaptureExpr(enclosingFuncs),
        ]),
      ),
    ),
  );
}

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

function guardCall(): AstNode {
  return markSynthetic(expr(call(id(GUARD))));
}
