import * as acorn from "acorn";

export type AnyFunction =
  | acorn.FunctionDeclaration
  | acorn.FunctionExpression
  | acorn.ArrowFunctionExpression;

export const FUNCTION_NODE_TYPES: string[] = [
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
];

export function extractParamNames(params: acorn.Pattern[]): string[] {
  return params.map((p) => {
    if (p.type === "Identifier") return p.name;
    if (p.type === "AssignmentPattern" && p.left.type === "Identifier") return p.left.name;
    return "arg";
  });
}
