import { TRACE_LINE, CREATE_PROXY, GUARD } from "../constants";
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
import { collectVarNamesInFuncs } from "./scope";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AstNode = any;

export function markSynthetic(node: AstNode): AstNode {
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

export function traceLineCall(line: number, varNames: string[]): AstNode {
  return markSynthetic(expr(call(id(TRACE_LINE), [literal(line), captureVarsExpr(varNames)])));
}

export function paramArrayLiteral(paramNames: string[]): AstNode {
  return markSynthetic({
    type: "ArrayExpression",
    elements: paramNames.map((p) => literal(p)),
    start: 0,
    end: 0,
  });
}

export function closureCaptureExpr(enclosingFuncs: AstNode[]): AstNode {
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

export function proxyReassignment(
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

export function guardCall(): AstNode {
  return markSynthetic(expr(call(id(GUARD))));
}
