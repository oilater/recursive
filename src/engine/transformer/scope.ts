import { ENTRY_FUNC_NAME } from "../constants";
import { FUNCTION_NODE_TYPES as FUNC_TYPES, extractParamNames } from "../ast-queries";
import { walkChildren, walkFuncBody } from "./traversal";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AstNode = any;

export interface ParentInfo {
  parent: AstNode;
  key: string;
}

export function collectUserFuncNames(node: AstNode, acc: Set<string> = new Set()): Set<string> {
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

export function collectVarNamesInFuncs(
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

export function collectOwnVarNames(funcNode: AstNode): string[] {
  return [...collectVarNamesInFuncs([funcNode])];
}

export function collectVisibleVarNames(enclosingFuncs: AstNode[]): string[] {
  return [...collectVarNamesInFuncs(enclosingFuncs, { skipEntryParams: true })];
}

export function determineFuncName(
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

export function shouldWrapReturn(retStmt: AstNode, userFuncs: Set<string>): boolean {
  return !!retStmt.argument && hasUserFunctionCall(retStmt.argument, userFuncs);
}
