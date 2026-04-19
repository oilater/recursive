import * as acorn from "acorn";
import { generate } from "astring";
import type { AnalysisResult } from "./types";
import { ENTRY_FUNC_NAME, TRACE_LINE, CREATE_PROXY, GUARD } from "./constants";
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

interface ParentInfo {
  parent: AstNode;
  key: string;
}

const LOOP_TYPES = [
  "ForStatement",
  "WhileStatement",
  "DoWhileStatement",
  "ForInStatement",
  "ForOfStatement",
];

const FUNC_TYPES = ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"];

const SKIP_KEYS = new Set(["type", "start", "end", "loc"]);

function walkChildren(node: AstNode, visit: (child: AstNode) => void): void {
  for (const key of Object.keys(node)) {
    if (SKIP_KEYS.has(key)) continue;
    const val = node[key];
    if (!val || typeof val !== "object") continue;
    if (Array.isArray(val)) {
      for (const item of val) if (item?.type) visit(item);
    } else if (val.type) {
      visit(val);
    }
  }
}

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

function collectUserFuncNames(node: AstNode, acc: Set<string> = new Set()): Set<string> {
  if (!node || typeof node !== "object") return acc;
  if (node.type === "FunctionDeclaration" && node.id?.name) {
    acc.add(node.id.name);
  }
  if (
    node.type === "VariableDeclarator" &&
    node.id?.type === "Identifier" &&
    node.init &&
    FUNC_TYPES.includes(node.init.type)
  ) {
    acc.add(node.id.name);
  }
  walkChildren(node, (child) => collectUserFuncNames(child, acc));
  return acc;
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

function hasUserFunctionCall(node: AstNode, userFuncs: Set<string>): boolean {
  if (!node || typeof node !== "object") return false;
  if (
    node.type === "CallExpression" &&
    !node.__synthetic &&
    node.callee?.type === "Identifier" &&
    userFuncs.has(node.callee.name)
  ) {
    return true;
  }
  if (FUNC_TYPES.includes(node.type)) return false;
  let found = false;
  walkChildren(node, (child) => {
    if (found) return;
    if (hasUserFunctionCall(child, userFuncs)) found = true;
  });
  return found;
}

function shouldWrapReturn(retStmt: AstNode, userFuncs: Set<string>): boolean {
  return !!retStmt.argument && hasUserFunctionCall(retStmt.argument, userFuncs);
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

function extractParamNames(params: AstNode[]): string[] {
  return (params ?? []).map((p: AstNode) => {
    if (p.type === "Identifier") return p.name;
    if (p.type === "AssignmentPattern" && p.left?.type === "Identifier") return p.left.name;
    return "arg";
  });
}

function walkFuncBody(func: AstNode, visit: (n: AstNode) => void): void {
  if (func.body?.type !== "BlockStatement") return;
  function walk(n: AstNode) {
    if (!n || typeof n !== "object" || n.__synthetic) return;
    if (FUNC_TYPES.includes(n.type)) return;
    visit(n);
    walkChildren(n, walk);
  }
  for (const stmt of func.body.body) walk(stmt);
}

function collectVarNamesInFuncs(
  funcs: AstNode[],
  options: { skipEntryParams?: boolean; skipEntryBody?: boolean } = {},
): Set<string> {
  const names = new Set<string>();
  for (const func of funcs) {
    const isEntry = func.id?.name === ENTRY_FUNC_NAME;
    if (!(isEntry && options.skipEntryParams)) {
      for (const name of extractParamNames(func.params || [])) {
        if (name && name !== "_" && name !== "arg") names.add(name);
      }
    }
    if (!(isEntry && options.skipEntryBody)) {
      walkFuncBody(func, (n) => {
        if (n.type === "VariableDeclarator" && n.id?.type === "Identifier") {
          names.add(n.id.name);
        }
      });
    }
  }
  return names;
}

function collectOwnVarNames(funcNode: AstNode): string[] {
  return [...collectVarNamesInFuncs([funcNode])];
}

function collectVisibleVarNames(enclosingFuncs: AstNode[]): string[] {
  return [...collectVarNamesInFuncs(enclosingFuncs, { skipEntryParams: true })];
}

function determineFuncName(
  node: AstNode,
  parentInfo: ParentInfo | null,
  enclosingFuncs: AstNode[] = [],
): string {
  if (node.id?.name) return node.id.name;
  const parent = parentInfo?.parent;
  if (parent) {
    if (parent.type === "VariableDeclarator" && parent.id?.type === "Identifier") {
      return parent.id.name;
    }
    if (parent.type === "Property" && parent.key?.type === "Identifier") {
      return parent.key.name;
    }
    if (parent.type === "AssignmentExpression" && parent.left?.type === "Identifier") {
      return parent.left.name;
    }
  }
  for (let i = enclosingFuncs.length - 1; i >= 0; i--) {
    const enclosingName = enclosingFuncs[i].__funcName;
    if (enclosingName && enclosingName !== ENTRY_FUNC_NAME) {
      return `${enclosingName}$inner`;
    }
  }
  const line = node.loc?.start?.line ?? 0;
  const col = node.loc?.start?.column ?? 0;
  return `<anon@${line}:${col}>`;
}

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
