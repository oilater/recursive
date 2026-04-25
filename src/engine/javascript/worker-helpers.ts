import type { Frame, TreeNode } from "@/algorithm/types";

/**
 * Worker-internal frame with mutable bookkeeping fields the viewer does not see.
 * `ownVarNames` drives variable attribution; `lastLine` tracks the most recent
 * traced line for this frame; `nodeId` / `node` link the frame to its call-tree
 * node when the enclosing function is the recursive entry point.
 */
export interface WorkerFrame extends Frame {
  ownVarNames?: string[];
  lastLine?: number;
  nodeId?: string;
  node?: TreeNode;
}

const MAX_INLINE_ARRAY_LEN = 8;
const ARRAY_PREVIEW_HEAD = 3;
const MAX_OBJECT_JSON_LEN = 20;
const OBJECT_TRUNCATE_AT = 17;

function formatArray(a: unknown[]): string {
  if (a.length > MAX_INLINE_ARRAY_LEN) {
    return `[${a.slice(0, ARRAY_PREVIEW_HEAD).join(",")},...(${a.length})]`;
  }
  if (a.length > 0 && Array.isArray(a[0])) {
    return `[[...]](${a.length}x${(a[0] as unknown[]).length})`;
  }
  return `[${a.join(",")}]`;
}

function formatObject(a: object): string {
  const s = JSON.stringify(a);
  return s.length > MAX_OBJECT_JSON_LEN ? `${s.slice(0, OBJECT_TRUNCATE_AT)}...` : s;
}

function formatArg(a: unknown): string {
  if (a === undefined) return "undefined";
  if (a === null) return "null";
  if (Array.isArray(a)) return formatArray(a);
  if (typeof a === "object") return formatObject(a);
  return String(a);
}

export function formatArgs(argsList: unknown[]): string {
  return argsList.map(formatArg).join(", ");
}

/** Attributes writes to the correct lexical scope instead of the top frame. */
export function ownerFrameIndex(
  stack: WorkerFrame[],
  varName: string,
  fromIdx: number,
): number {
  for (let i = fromIdx; i >= 0; i--) {
    if (stack[i].ownVarNames?.includes(varName)) return i;
  }
  return -1;
}

/** Shallow by design — values are deep-cloned later at collection time in __traceLine. */
export function cloneFrame(frame: WorkerFrame): WorkerFrame {
  return { ...frame, variables: { ...frame.variables } };
}
