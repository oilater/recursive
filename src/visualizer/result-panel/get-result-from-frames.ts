import type { Step } from "@/algorithm";

/**
 * Search step frames for a `result` key (used by preset algorithms to
 * accumulate visible results). Returns the first match starting from the
 * active (top) frame and walking down to the root.
 */
export function getResultFromFrames(step: Step): unknown {
  for (let i = step.frames.length - 1; i >= 0; i--) {
    const value = step.frames[i].variables.result;
    if (value !== undefined) return value;
  }
  return undefined;
}
