import * as acorn from "acorn";
import { generate } from "astring";
import type { AnalysisResult } from "./types";
import { ENTRY_FUNC_NAME, TRACE_LINE, CAPTURE_VARS, CREATE_PROXY, GUARD } from "./constants";
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

const FUNC_TYPES = ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"];

export function transformCode(strippedCode: string, _analysis: AnalysisResult): string {
  const ast = acorn.parse(strippedCode, {
    ecmaVersion: 2022,
    sourceType: "script",
    locations: true,
  }) as AstNode;
  walkAndTransform(ast, []);
  return generate(ast);
}

function walkAndTransform(node: AstNode, enclosingFuncs: AstNode[]): void {
  if (!node || typeof node !== "object" || node.__synthetic) return;

  if (
    node.type === "ArrowFunctionExpression" &&
    node.body &&
    node.body.type !== "BlockStatement"
  ) {
    node.body = block([ret(node.body)]);
  }

  const nextEnclosing =
    FUNC_TYPES.includes(node.type) && node.body?.type === "BlockStatement"
      ? [...enclosingFuncs, node]
      : enclosingFuncs;

  if (Array.isArray(node.body)) {
    transformBlockBody(node, enclosingFuncs);
    for (const stmt of node.body) walkAndTransform(stmt, nextEnclosing);
    return;
  }

  for (const key of Object.keys(node)) {
    if (["type", "start", "end", "loc"].includes(key)) continue;
    const val = node[key];
    if (val && typeof val === "object") {
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item?.type) walkAndTransform(item, nextEnclosing);
        }
      } else if (val.type) {
        walkAndTransform(val, nextEnclosing);
      }
    }
  }
}

function transformBlockBody(node: AstNode, enclosingFuncs: AstNode[]): void {
  const enclosingFunc = enclosingFuncs[enclosingFuncs.length - 1] ?? null;
  const isFuncBody =
    enclosingFunc !== null && enclosingFunc.body === node && !enclosingFunc.__bodyTransformed;

  const newBody: AstNode[] = [];
  let captureInjected = false;

  for (const stmt of node.body) {
    if (isLoop(stmt) && stmt.body?.type === "BlockStatement" && Array.isArray(stmt.body.body)) {
      const loopLine = stmt.loc?.start?.line;
      const loopBackTrace =
        enclosingFunc !== null && loopLine ? [traceLineCall(loopLine)] : [];
      stmt.body.body = [guardCall(), ...stmt.body.body, ...loopBackTrace];
    }

    if (isFuncBody && !captureInjected) {
      newBody.push(captureVarsInit(collectVisibleVarNames(enclosingFuncs)));
      captureInjected = true;
    }

    const skipTrace = stmt.type === "FunctionDeclaration" || stmt.type === "EmptyStatement";
    if (enclosingFunc !== null && stmt.loc?.start?.line && !skipTrace) {
      newBody.push(traceLineCall(stmt.loc.start.line));
    }

    newBody.push(stmt);

    if (
      stmt.type === "FunctionDeclaration" &&
      stmt.id?.name &&
      stmt.id.name !== ENTRY_FUNC_NAME
    ) {
      newBody.push(
        proxyReassignment(stmt.id.name, extractParamNames(stmt.params), collectOwnVarNames(stmt)),
      );
    }

    if (stmt.type === "VariableDeclaration" && stmt.declarations) {
      for (const decl of stmt.declarations) {
        if (
          decl.id?.type === "Identifier" &&
          decl.id.name !== ENTRY_FUNC_NAME &&
          decl.init &&
          (decl.init.type === "FunctionExpression" ||
            decl.init.type === "ArrowFunctionExpression")
        ) {
          decl.init = wrapFunctionInProxy(decl.init, decl.id.name);
        }
      }
    }
  }

  if (isFuncBody && newBody.length > 0) {
    const lastStmt = node.body[node.body.length - 1];
    const lastLine = lastStmt?.loc?.end?.line ?? lastStmt?.loc?.start?.line;
    if (lastLine) newBody.push(traceLineCall(lastLine));
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

function collectOwnVarNames(funcNode: AstNode): string[] {
  const names = new Set<string>();
  for (const name of extractParamNames(funcNode.params || [])) {
    if (name && name !== "_" && name !== "arg") names.add(name);
  }
  if (funcNode.body?.type !== "BlockStatement") return [...names];

  function walk(n: AstNode) {
    if (!n || typeof n !== "object" || n.__synthetic) return;
    if (FUNC_TYPES.includes(n.type)) return;
    if (n.type === "VariableDeclarator" && n.id?.type === "Identifier") {
      names.add(n.id.name);
    }
    for (const key of Object.keys(n)) {
      if (["type", "start", "end", "loc"].includes(key)) continue;
      const val = n[key];
      if (val && typeof val === "object") {
        if (Array.isArray(val)) {
          for (const item of val) walk(item);
        } else {
          walk(val);
        }
      }
    }
  }
  for (const stmt of funcNode.body.body) walk(stmt);
  return [...names];
}

function collectVisibleVarNames(enclosingFuncs: AstNode[]): string[] {
  const names = new Set<string>();
  for (const func of enclosingFuncs) {
    if (func.id?.name === ENTRY_FUNC_NAME) continue;
    for (const name of extractParamNames(func.params || [])) {
      if (name && name !== "_" && name !== "arg") names.add(name);
    }
  }
  const innermost = enclosingFuncs[enclosingFuncs.length - 1];
  if (!innermost || innermost.body?.type !== "BlockStatement") return [...names];

  for (const func of enclosingFuncs) {
    if (func.body?.type !== "BlockStatement") continue;
    function walk(n: AstNode) {
      if (!n || typeof n !== "object" || n.__synthetic) return;
      if (FUNC_TYPES.includes(n.type)) return;
      if (n.type === "VariableDeclarator" && n.id?.type === "Identifier") {
        names.add(n.id.name);
      }
      for (const key of Object.keys(n)) {
        if (["type", "start", "end", "loc"].includes(key)) continue;
        const val = n[key];
        if (val && typeof val === "object") {
          if (Array.isArray(val)) {
            for (const item of val) walk(item);
          } else {
            walk(val);
          }
        }
      }
    }
    for (const stmt of func.body.body) walk(stmt);
  }
  return [...names];
}

function mark(node: AstNode): AstNode {
  node.__synthetic = true;
  return node;
}

function captureVarsInit(varNames: string[]): AstNode {
  const tryBlocks = varNames.map((name) =>
    tryCatch(
      [expr(assign(member(id("__v"), id(name)), id(name)))],
      [expr(assign(member(id("__v"), id(name)), literal("-")))],
    ),
  );
  return mark(
    varDecl(
      CAPTURE_VARS,
      funcExpr([], block([varDecl("__v", obj()), ...tryBlocks, ret(id("__v"))])),
    ),
  );
}

function traceLineCall(line: number): AstNode {
  return mark(expr(call(id(TRACE_LINE), [literal(line), call(id(CAPTURE_VARS))])));
}

function paramArrayLiteral(paramNames: string[]): AstNode {
  return mark({
    type: "ArrayExpression",
    elements: paramNames.map((p) => literal(p)),
    start: 0,
    end: 0,
  });
}

function proxyReassignment(funcName: string, paramNames: string[], ownVars: string[]): AstNode {
  return mark(
    expr(
      assign(
        id(funcName),
        call(id(CREATE_PROXY), [
          id(funcName),
          literal(funcName),
          paramArrayLiteral(paramNames),
          paramArrayLiteral(ownVars),
        ]),
      ),
    ),
  );
}

function wrapFunctionInProxy(funcExpression: AstNode, funcName: string): AstNode {
  return call(id(CREATE_PROXY), [
    funcExpression,
    literal(funcName),
    paramArrayLiteral(extractParamNames(funcExpression.params || [])),
    paramArrayLiteral(collectOwnVarNames(funcExpression)),
  ]);
}

function guardCall(): AstNode {
  return mark(expr(call(id(GUARD))));
}
