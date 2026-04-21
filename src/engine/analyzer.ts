import * as acorn from "acorn";
import * as walk from "acorn-walk";
import { stripTypeScript } from "./strip-types";
import type { AnalysisResult } from "./types";
import { ENTRY_FUNC_NAME } from "./constants";
import { type AnyFunction, extractParamNames } from "./ast-queries";

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

function collectTopLevelVarNames(program: acorn.Program): string[] {
  const names = new Set<string>();

  for (const stmt of program.body) {
    walk.recursive(stmt, null, {
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
  }

  return [...names];
}

export function analyzeCode(code: string): AnalyzeCodeResult {
  const strippedCode = stripTypeScript(code);

  let ast: acorn.Program;
  try {
    ast = acorn.parse(strippedCode, {
      ecmaVersion: 2022,
      sourceType: "script",
      locations: true,
    });
  } catch (e: unknown) {
    throw new Error(`Syntax error: ${e instanceof Error ? e.message : String(e)}`);
  }

  const functions = findAllFunctions(ast);
  const topLevelFunc = functions[0] ?? null;
  const recursiveFunc = functions.find((f) => f.isRecursive) ?? null;
  const entryOwnVarNames = collectTopLevelVarNames(ast);

  const returnRef = topLevelFunc ? `\nreturn ${topLevelFunc.name};` : "";
  const wrappedCode = `function ${ENTRY_FUNC_NAME}() {\n${strippedCode}${returnRef}\n}`;

  const hasTopLevelCall = topLevelFunc ? hasTopLevelCallTo(ast, topLevelFunc.name) : false;

  return {
    strippedCode: wrappedCode,
    analysis: {
      entryFuncName: ENTRY_FUNC_NAME,
      entryParamNames: topLevelFunc?.params ?? [],
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
