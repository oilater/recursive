import type { StepGeneratorResult } from "@/algorithm/types";
import { buildPyodideWorkerCode } from "./pyodide-worker";
import { DEFAULT_TIMEOUT_MS } from "../constants";

export type PyodideState = "idle" | "loading" | "ready" | "error";

export interface PythonExecuteResult {
  result: StepGeneratorResult;
  hasRecursion: boolean;
  finalReturnValue?: unknown;
  consoleLogs?: Array<{ text: string; stepIdx: number }>;
}

let worker: Worker | null = null;
let state: PyodideState = "idle";
let readyPromise: Promise<void> | null = null;
const stateListeners: Set<(state: PyodideState) => void> = new Set();

function notifyState(newState: PyodideState) {
  state = newState;
  stateListeners.forEach((fn) => fn(newState));
}

export function getPyodideState(): PyodideState {
  return state;
}

export function onPyodideStateChange(listener: (state: PyodideState) => void): () => void {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

export function ensurePyodideWorker(): Promise<void> {
  if (state === "ready" && worker) return Promise.resolve();
  if (readyPromise) return readyPromise;

  notifyState("loading");

  readyPromise = new Promise<void>((resolve, reject) => {
    const blob = new Blob([buildPyodideWorkerCode()], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    worker = new Worker(url);
    URL.revokeObjectURL(url);

    const initHandler = (e: MessageEvent) => {
      if (e.data.type === "ready") {
        worker!.removeEventListener("message", initHandler);
        notifyState("ready");
        resolve();
      } else if (e.data.type === "error") {
        worker!.removeEventListener("message", initHandler);
        notifyState("error");
        reject(new Error(e.data.message));
      }
    };

    worker.addEventListener("message", initHandler);
    worker.postMessage({ type: "init" });
  });

  return readyPromise;
}

export async function executePython(
  code: string,
  args: unknown[],
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<PythonExecuteResult> {
  await ensurePyodideWorker();

  if (!worker) throw new Error("Pyodide worker not initialized.");

  return new Promise<PythonExecuteResult>((resolve, reject) => {
    const timer = setTimeout(() => {
      worker!.terminate();
      worker = null;
      state = "idle";
      readyPromise = null;
      reject(new Error(`Execution timed out after ${timeoutMs / 1000} seconds.`));
    }, timeoutMs);

    const handler = (e: MessageEvent) => {
      clearTimeout(timer);
      worker!.removeEventListener("message", handler);

      if (e.data.type === "success") {
        resolve({
          result: e.data.result,
          hasRecursion: e.data.hasRecursion,
          finalReturnValue: e.data.finalReturnValue,
          consoleLogs: e.data.consoleLogs,
        });
      } else {
        reject(new Error(e.data.message));
      }
    };

    worker!.addEventListener("message", handler);
    worker!.postMessage({ type: "execute", code, args });
  });
}
