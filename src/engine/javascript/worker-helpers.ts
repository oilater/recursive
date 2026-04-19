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

/**
 * Render a human-readable preview string for call-tree node labels.
 *
 * - Arrays longer than 8 items show the first 3 + `...(N)`
 * - Arrays whose first element is itself an array render as `[[...]](RxC)`
 * - Non-array objects are JSON-stringified and truncated to 20 chars
 * - Primitives use `String(x)`; `undefined` / `null` pass through verbatim
 */
export function formatArgs(argsList: unknown[]): string {
  return argsList
    .map((a: unknown): string => {
      if (a === undefined) return "undefined";
      if (a === null) return "null";
      if (Array.isArray(a)) {
        if (a.length > 8) return "[" + a.slice(0, 3).join(",") + ",...(" + a.length + ")]";
        if (a.length > 0 && Array.isArray(a[0]))
          return "[[...]](" + a.length + "x" + (a[0] as unknown[]).length + ")";
        return "[" + a.join(",") + "]";
      }
      if (typeof a === "object") {
        const s = JSON.stringify(a);
        return s.length > 20 ? s.slice(0, 17) + "..." : s;
      }
      return String(a);
    })
    .join(", ");
}

/**
 * Shallow clone of a WorkerFrame with a fresh `variables` object.
 * Each variable value itself is copied by reference — the deep clone happens
 * at collection time in __traceLine, not here.
 */
export function cloneFrame(frame: WorkerFrame): WorkerFrame {
  const copy: WorkerFrame = {
    funcName: frame.funcName,
    variables: {},
    ownVarNames: frame.ownVarNames,
    lastLine: frame.lastLine,
  };
  for (const k in frame.variables) {
    if (Object.prototype.hasOwnProperty.call(frame.variables, k)) {
      copy.variables[k] = frame.variables[k];
    }
  }
  if (frame.nodeId) {
    copy.nodeId = frame.nodeId;
    copy.node = frame.node;
  }
  return copy;
}
