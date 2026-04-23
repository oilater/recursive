import { ENTRY_FUNC_NAME } from "../constants";
import { FUNCTION_NODE_TYPES as FUNC_TYPES } from "../ast-queries";
import { id, block, varDecl, ret } from "../ast-builders";
import { walkChildren } from "./traversal";
import { collectVisibleVarNames, shouldWrapReturn } from "./scope";
import { markSynthetic, traceLineCall } from "./emission";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AstNode = any;

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

export function wrapAllReturns(
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
