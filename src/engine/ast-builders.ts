/* eslint-disable @typescript-eslint/no-explicit-any */
type AstNode = any;

const n = (type: string, props: Record<string, unknown> = {}): AstNode => ({
  type,
  start: 0,
  end: 0,
  ...props,
});

export const id = (name: string) => n("Identifier", { name });

export const literal = (value: unknown) => n("Literal", { value, raw: JSON.stringify(value) });

export const call = (callee: AstNode, args: AstNode[] = []) =>
  n("CallExpression", { callee, arguments: args, optional: false });

export const assign = (left: AstNode, right: AstNode) =>
  n("AssignmentExpression", { operator: "=", left, right });

export const member = (obj: AstNode, prop: AstNode) =>
  n("MemberExpression", { object: obj, property: prop, computed: false, optional: false });

export const expr = (expression: AstNode) => n("ExpressionStatement", { expression });

export const block = (body: AstNode[]) => n("BlockStatement", { body });

export const varDecl = (name: string, init: AstNode) =>
  n("VariableDeclaration", {
    kind: "var",
    declarations: [n("VariableDeclarator", { id: id(name), init })],
  });

export const tryCatch = (tryBody: AstNode[], catchBody: AstNode[] = []) =>
  n("TryStatement", {
    block: block(tryBody),
    handler: n("CatchClause", { param: id("__e"), body: block(catchBody) }),
    finalizer: null,
  });

export const ret = (argument: AstNode) => n("ReturnStatement", { argument });

export const funcExpr = (params: AstNode[], body: AstNode) =>
  n("FunctionExpression", { id: null, params, body, generator: false, async: false });

export const obj = (properties: AstNode[] = []) => n("ObjectExpression", { properties });

export const shorthandProp = (name: string) =>
  n("Property", { method: false, shorthand: true, computed: false, key: id(name), value: id(name), kind: "init" });
