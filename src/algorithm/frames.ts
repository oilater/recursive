import { ENTRY_FUNC_NAME } from "@/engine/constants";
import type { Frame, Step } from "./types";

export function findPrevFrame(
  prevStep: Step | undefined,
  depth: number,
  funcName: string,
): Frame | undefined {
  if (!prevStep) return undefined;
  const candidate = prevStep.frames[depth];
  if (candidate && candidate.funcName === funcName) return candidate;
  return undefined;
}

export function isEntryFrame(frame: Frame): boolean {
  return frame.funcName === ENTRY_FUNC_NAME;
}

export function isVisibleFrame(frame: Frame): boolean {
  return !isEntryFrame(frame) || Object.keys(frame.variables).length > 0;
}
