import { FUNCTION_NODE_TYPES as FUNC_TYPES } from "../ast-queries";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AstNode = any;

const SKIP_KEYS = new Set(["type", "start", "end", "loc"]);

export function walkChildren(node: AstNode, visit: (child: AstNode) => void): void {
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

export function walkFuncBody(func: AstNode, visit: (n: AstNode) => void): void {
  if (func.body?.type !== "BlockStatement") return;
  function walk(n: AstNode) {
    if (!n || typeof n !== "object" || n.__synthetic) return;
    if (FUNC_TYPES.includes(n.type)) return;
    visit(n);
    walkChildren(n, walk);
  }
  for (const stmt of func.body.body) walk(stmt);
}
