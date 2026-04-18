/**
 * Pyodide Worker code as a string.
 * Uses importScripts to load Pyodide from CDN (classic Worker).
 */
import { PYTHON_TRACER } from "./tracer.py";

const PYODIDE_VERSION = "0.27.5";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

export function buildPyodideWorkerCode(): string {
  return `
"use strict";

importScripts("${PYODIDE_CDN}pyodide.js");

let pyodide = null;
let isReady = false;

async function initialize() {
  try {
    pyodide = await loadPyodide({ indexURL: "${PYODIDE_CDN}" });

    // Disable network APIs after Pyodide is loaded
    self.importScripts = undefined;
    self.fetch = undefined;
    self.XMLHttpRequest = undefined;
    self.WebSocket = undefined;
    self.EventSource = undefined;

    // Remove dangerous modules
    pyodide.runPython(\`
import sys
for mod in ['subprocess', 'os', 'shutil', 'socket', 'ctypes', 'multiprocessing']:
    sys.modules[mod] = None
sys.setrecursionlimit(200)
\`);

    // Load tracer
    pyodide.runPython(${JSON.stringify(PYTHON_TRACER)});

    isReady = true;
    self.postMessage({ type: "ready" });
  } catch (err) {
    self.postMessage({ type: "error", message: "Failed to initialize Python: " + (err.message || String(err)) });
  }
}

self.onmessage = async function(e) {
  var data = e.data;

  if (data.type === "init") {
    if (!isReady) {
      await initialize();
    } else {
      self.postMessage({ type: "ready" });
    }
    return;
  }

  if (data.type === "execute") {
    if (!isReady) {
      self.postMessage({ type: "error", message: "Python environment not ready." });
      return;
    }

    try {
      var code = data.code;
      var args = data.args || [];

      pyodide.globals.set("_user_code", code);
      pyodide.globals.set("_user_args", pyodide.toPy(args));

      pyodide.runPython("_result = _run_traced(_user_code, list(_user_args))");

      pyodide.runPython("import json as _json; _result_json = _json.dumps(_result, default=str)");
      var resultJson = pyodide.globals.get("_result_json");
      var result = JSON.parse(resultJson);

      var steps = (result.steps || []).map(function(s) {
        var step = {
          id: s.id,
          type: s.type,
          codeLine: s.codeLine,
          activeNodeId: s.activeNodeId,
          activePath: s.activePath || [],
          frames: s.frames || [],
          description: s.description || ""
        };
        if (s.callerLine != null) step.callerLine = s.callerLine;
        return step;
      });

      function convertTree(node) {
        return {
          id: node.id || "root",
          label: node.label || "",
          args: node.args || "",
          children: (node.children || []).map(convertTree),
          status: node.status || "completed"
        };
      }

      self.postMessage({
        type: "success",
        result: { steps: steps, tree: convertTree(result.tree) },
        hasRecursion: result.hasRecursion || false,
        finalReturnValue: result.finalReturnValue,
        consoleLogs: result.consoleLogs || []
      });
    } catch (err) {
      self.postMessage({ type: "error", message: err.message || String(err) });
    }
  }
};
`;
}
