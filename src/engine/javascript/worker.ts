/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Step, TreeNode } from "@/algorithm/types";
import type {
  JsWorkerInboundMessage,
  JsWorkerOutboundMessage,
  JsWorkerConsoleEntry,
} from "./worker-types";
import { cloneFrame, formatArgs } from "./worker-helpers";
import type { WorkerFrame } from "./worker-helpers";

// Security shims — must run before any call to `new Function(...)` that
// executes user-transformed code below. No imports emit runtime code above
// this point (the imports are type-only), so this is the effective top.
(self as any).fetch = undefined;
(self as any).XMLHttpRequest = undefined;
(self as any).importScripts = undefined;
(self as any).WebSocket = undefined;
(self as any).EventSource = undefined;

interface ClosureMeta {
  funcName: string;
  paramNames: string[];
  snapshot: Record<string, unknown> | null;
}

self.onmessage = (e: MessageEvent<JsWorkerInboundMessage>) => {
  const data = e.data;
  const transformedCode = data.transformedCode;
  const entryFuncName = data.entryFuncName;
  const args = data.args;
  const hasRecursion = data.hasRecursion;
  const recursiveFuncName = data.recursiveFuncName;
  const recursiveParamNames = data.recursiveParamNames || [];
  const maxCalls = data.maxCalls || 5000;
  const maxLoopIterations = data.maxLoopIterations || 100000;
  const maxSteps = data.maxSteps || 10000;
  const lineOffset = data.lineOffset || 0;
  const userFunc = data.userTopLevelFuncName;
  const entryOwnVarNames = data.entryOwnVarNames || [];
  const originalLineCount = data.originalLineCount || 9999;

  try {
    const steps: Step[] = [];
    let stepId = 0;
    let nodeIdCounter = 0;
    let callCount = 0;
    let loopCount = 0;
    const callStack: WorkerFrame[] = [];
    const closureMap = new WeakMap<object, ClosureMeta>();

    function deepClone(val: unknown): unknown {
      if (val === null || val === undefined) return val;
      if (typeof val === "function") {
        const fnMeta = closureMap.get(val as object);
        const closure: Record<string, unknown> = {};
        if (fnMeta && fnMeta.snapshot) {
          for (const ck in fnMeta.snapshot) {
            if (Object.prototype.hasOwnProperty.call(fnMeta.snapshot, ck)) {
              closure[ck] = deepClone(fnMeta.snapshot[ck]);
            }
          }
        }
        return {
          __kind: "function",
          funcName: (fnMeta && fnMeta.funcName) || (val as { name?: string }).name || "anonymous",
          params: (fnMeta && fnMeta.paramNames) || [],
          closure,
        };
      }
      if (typeof val !== "object") return val;
      if (Array.isArray(val)) return val.map(deepClone);
      try {
        return JSON.parse(JSON.stringify(val));
      } catch (_) {
        return String(val);
      }
    }

    const rootNode: TreeNode = {
      id: "node-" + nodeIdCounter++,
      label: userFunc || entryFuncName,
      args: formatArgs(args),
      children: [],
      status: "completed",
    };

    callStack.push({ funcName: entryFuncName, variables: {}, ownVarNames: entryOwnVarNames });

    function getPath(activeNodeId: string | null): string[] {
      const path: string[] = [];
      if (hasRecursion && rootNode.children.length > 0) path.push(rootNode.id);
      for (let i = 0; i < callStack.length; i++) {
        const nid = callStack[i].nodeId;
        if (nid) path.push(nid);
      }
      if (activeNodeId && path[path.length - 1] !== activeNodeId) path.push(activeNodeId);
      return path;
    }

    function __guard(): void {
      loopCount++;
      if (loopCount > maxLoopIterations) {
        throw new Error("Loop iteration limit exceeded (" + maxLoopIterations + ").");
      }
    }

    // Frames are replaced (not mutated), so a slice keeps each step's view stable.
    function snapshotFrames(): WorkerFrame[] {
      return callStack.slice();
    }

    function ownerFrameIndex(varName: string, fromIdx: number): number {
      for (let i = fromIdx; i >= 0; i--) {
        const owns = callStack[i].ownVarNames;
        if (owns && owns.indexOf(varName) !== -1) return i;
      }
      return -1;
    }

    function __traceLine(line: number, varsSnapshot: Record<string, unknown> | undefined): void {
      if (steps.length >= maxSteps) {
        throw new Error("Step limit exceeded (" + maxSteps + "). Try smaller input.");
      }
      const correctedLine = line - lineOffset;
      if (correctedLine < 1 || correctedLine > originalLineCount) return;

      const topIdx = callStack.length - 1;
      const modified: Record<number, WorkerFrame> = {};

      function getOrClone(idx: number): WorkerFrame {
        if (modified[idx]) return modified[idx];
        const clone = cloneFrame(callStack[idx]);
        modified[idx] = clone;
        return clone;
      }

      if (varsSnapshot) {
        for (const k in varsSnapshot) {
          if (!Object.prototype.hasOwnProperty.call(varsSnapshot, k)) continue;
          let ownerIdx = ownerFrameIndex(k, topIdx);
          if (ownerIdx === -1) ownerIdx = topIdx;
          getOrClone(ownerIdx).variables[k] = deepClone(varsSnapshot[k]);
        }
      }

      const topClone = getOrClone(topIdx);
      topClone.lastLine = correctedLine;

      for (const idx in modified) {
        if (Object.prototype.hasOwnProperty.call(modified, idx)) {
          callStack[Number(idx)] = modified[idx];
        }
      }

      let currentNodeId: string | null = null;
      for (let j = callStack.length - 1; j >= 0; j--) {
        const nid = callStack[j].nodeId;
        if (nid) {
          currentNodeId = nid;
          break;
        }
      }
      if (!currentNodeId) currentNodeId = rootNode.id;

      let callerLine: number | undefined;
      if (topIdx > 0) {
        const parentFrame = callStack[topIdx - 1];
        if (typeof parentFrame.lastLine === "number" && parentFrame.lastLine !== correctedLine) {
          callerLine = parentFrame.lastLine;
        }
      }

      steps.push({
        id: stepId++,
        type: "call",
        codeLine: correctedLine,
        callerLine,
        activeNodeId: currentNodeId,
        activePath: getPath(currentNodeId),
        frames: snapshotFrames(),
        description: "",
      });
    }

    function __createProxy(
      originalFunc: Function,
      funcName: string,
      paramNames: string[],
      ownVarNames: string[],
      captureClosureFn?: () => Record<string, unknown> | null,
    ): Function {
      funcName = funcName || (hasRecursion ? (recursiveFuncName as string) : originalFunc.name || "anonymous");
      paramNames = paramNames || (hasRecursion ? recursiveParamNames : []);
      ownVarNames = ownVarNames || paramNames;

      const proxy = new Proxy(originalFunc, {
        apply: function (target, thisArg, argsList) {
          callCount++;
          if (callCount > maxCalls) {
            throw new Error("Function call count exceeded " + maxCalls + " calls.");
          }

          let nodeId: string | null = null;
          let node: TreeNode | null = null;
          if (hasRecursion && funcName === recursiveFuncName) {
            nodeId = "node-" + nodeIdCounter++;
            node = {
              id: nodeId,
              label: funcName,
              args: formatArgs(argsList),
              children: [],
              status: "idle",
            };
            let parentNode: TreeNode = rootNode;
            for (let p = callStack.length - 1; p >= 0; p--) {
              const pn = callStack[p].node;
              if (pn) {
                parentNode = pn;
                break;
              }
            }
            parentNode.children.push(node);
          }

          const seedVars: Record<string, unknown> = {};
          for (let i = 0; i < paramNames.length; i++) {
            seedVars[paramNames[i]] = deepClone(argsList[i]);
          }
          const frame: WorkerFrame = {
            funcName,
            variables: seedVars,
            ownVarNames,
          };
          if (nodeId) {
            frame.nodeId = nodeId;
            frame.node = node!;
          }
          callStack.push(frame);

          let result: unknown;
          try {
            result = Reflect.apply(target, thisArg, argsList);
          } catch (err) {
            if (node) node.status = "backtracked";
            callStack.pop();
            throw err;
          }

          if (node) node.status = "completed";
          callStack.pop();
          return result;
        },
      });

      const meta: ClosureMeta = { funcName, paramNames, snapshot: null };
      if (typeof captureClosureFn === "function") {
        try {
          const snapshot = captureClosureFn();
          if (snapshot && typeof snapshot === "object") meta.snapshot = snapshot;
        } catch (_) {
          // swallow — closure snapshot is best-effort
        }
      }
      closureMap.set(proxy, meta);

      return proxy;
    }

    const consoleLogs: JsWorkerConsoleEntry[] = [];
    const fakeConsole = {
      log: (...callArgs: unknown[]): void => {
        const text = callArgs
          .map((a: unknown) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
          .join(" ");
        consoleLogs.push({ text, stepIdx: stepId - 1 });
      },
      warn: (...callArgs: unknown[]): void => {
        fakeConsole.log(...callArgs);
      },
      error: (...callArgs: unknown[]): void => {
        fakeConsole.log(...callArgs);
      },
      info: (...callArgs: unknown[]): void => {
        fakeConsole.log(...callArgs);
      },
    };

    let runCode: string;
    const hasArgs = userFunc && args.length > 0;
    if (hasArgs) {
      runCode = transformedCode + "\nvar __fn = __entry__();\nreturn __fn.apply(null, __args);\n";
    } else {
      runCode = transformedCode + "\n__entry__();\n";
    }
    const runFn = new Function("__guard", "__createProxy", "__traceLine", "__args", "console", runCode);
    const finalReturnValue: unknown = runFn(__guard, __createProxy, __traceLine, args, fakeConsole);

    const successMessage: JsWorkerOutboundMessage = {
      type: "success",
      result: { steps, tree: rootNode },
      finalReturnValue: deepClone(finalReturnValue),
      consoleLogs,
    };
    self.postMessage(successMessage);
  } catch (err: unknown) {
    const message = (err as { message?: string } | null)?.message || String(err);
    const errorMessage: JsWorkerOutboundMessage = { type: "error", message };
    self.postMessage(errorMessage);
  }
};
