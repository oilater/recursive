import * as acorn from "acorn";
import * as walk from "acorn-walk";
import { stripTypeScript } from "./strip-types";
import type { AnalysisResult } from "./types";
import { ENTRY_FUNC_NAME } from "./constants";

type AnyFunction =
  | acorn.FunctionDeclaration
  | acorn.FunctionExpression
  | acorn.ArrowFunctionExpression;

interface FuncInfo {
  name: string;
  params: string[];
  startLine: number;
  endLine: number;
  isRecursive: boolean;
  node: AnyFunction;
}

const lineOf = (node: acorn.Node): number => node.loc?.start.line ?? 0;
const endLineOf = (node: acorn.Node): number => node.loc?.end.line ?? 0;

function extractParamNames(params: acorn.Pattern[]): string[] {
  return params.map((p) => {
    if (p.type === "Identifier") return p.name;
    if (p.type === "AssignmentPattern" && p.left.type === "Identifier") return p.left.name;
    return "arg";
  });
}

function isCallToName(call: acorn.CallExpression, name: string): boolean {
  return call.callee.type === "Identifier" && call.callee.name === name;
}

function hasCallTo(node: acorn.AnyNode, name: string): boolean {
  let found = false;
  walk.simple(node, {
    CallExpression(n) {
      if (isCallToName(n, name)) found = true;
    },
  });
  return found;
}

function findAllFunctions(ast: acorn.AnyNode): FuncInfo[] {
  const declared: FuncInfo[] = [];
  const assigned: FuncInfo[] = [];

  walk.recursive(ast, null, {
    FunctionDeclaration(node, state, c) {
      if (node.id) {
        const name = node.id.name;
        declared.push({
          name,
          params: extractParamNames(node.params),
          startLine: lineOf(node),
          endLine: endLineOf(node),
          isRecursive: hasCallTo(node.body, name),
          node,
        });
      }
      c(node.body, state);
    },
    VariableDeclarator(decl, state, c) {
      const init = decl.init;
      if (
        decl.id.type === "Identifier" &&
        init &&
        (init.type === "FunctionExpression" || init.type === "ArrowFunctionExpression")
      ) {
        const name = decl.id.name;
        assigned.push({
          name,
          params: extractParamNames(init.params),
          startLine: lineOf(decl),
          endLine: endLineOf(decl),
          isRecursive: hasCallTo(init.body, name),
          node: init,
        });
        c(init.body, state);
        return;
      }
      if (init) c(init, state);
    },
  });

  return [...declared, ...assigned];
}

export interface AnalyzeCodeResult {
  analysis: AnalysisResult;
  strippedCode: string;
}

function hasTopLevelCallTo(ast: acorn.Program, funcName: string): boolean {
  for (const stmt of ast.body) {
    if (stmt.type === "FunctionDeclaration") continue;
    if (hasCallTo(stmt, funcName)) return true;
  }
  return false;
}

function collectTopLevelVarNames(funcNode: AnyFunction): string[] {
  const names = new Set<string>();
  if (funcNode.body.type !== "BlockStatement") return [];

  walk.recursive(funcNode.body, null, {
    FunctionDeclaration(node) {
      if (node.id) names.add(node.id.name);
    },
    FunctionExpression() {},
    ArrowFunctionExpression() {},
    VariableDeclarator(node, state, c) {
      if (node.id.type === "Identifier") names.add(node.id.name);
      if (node.init) c(node.init, state);
    },
  });

  return [...names];
}

export function analyzeCode(code: string): AnalyzeCodeResult {
  const strippedCode = stripTypeScript(code);

  let originalAst: acorn.Program;
  try {
    originalAst = acorn.parse(strippedCode, {
      ecmaVersion: 2022,
      sourceType: "script",
      locations: true,
    });
  } catch (e: unknown) {
    throw new Error(`Syntax error: ${e instanceof Error ? e.message : String(e)}`);
  }

  const originalFunctions = findAllFunctions(originalAst);

  const topLevelFunc = originalFunctions.length > 0 ? originalFunctions[0] : null;
  const returnRef = topLevelFunc ? `\nreturn ${topLevelFunc.name};` : "";
  const wrappedCode = `function ${ENTRY_FUNC_NAME}() {\n${strippedCode}${returnRef}\n}`;
  const wrappedAst = acorn.parse(wrappedCode, {
    ecmaVersion: 2022,
    sourceType: "script",
    locations: true,
  });
  const wrappedFunctions = findAllFunctions(wrappedAst);
  const entryFunc = wrappedFunctions.find((f) => f.name === ENTRY_FUNC_NAME);

  const recursiveFunc =
    wrappedFunctions.find((f) => f.name !== ENTRY_FUNC_NAME && f.isRecursive) ?? null;

  const userFacingParams = topLevelFunc ? topLevelFunc.params : [];
  const hasTopLevelCall = topLevelFunc
    ? hasTopLevelCallTo(originalAst, topLevelFunc.name)
    : false;
  const entryOwnVarNames = entryFunc ? collectTopLevelVarNames(entryFunc.node) : [];

  return {
    strippedCode: wrappedCode,
    analysis: {
      entryFuncName: ENTRY_FUNC_NAME,
      entryParamNames: userFacingParams,
      entryOwnVarNames,
      recursiveFuncName: recursiveFunc?.name ?? null,
      recursiveParamNames: recursiveFunc?.params ?? [],
      hasRecursion: !!recursiveFunc,
      hasTopLevelCall,
      lineOffset: 1,
      userTopLevelFuncName: topLevelFunc?.name ?? null,
    },
  };
}
