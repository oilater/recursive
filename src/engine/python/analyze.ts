/**
 * Lightweight Python code analysis (client-side, no Pyodide needed).
 * Extracts function name and parameter names from the first top-level def.
 */
export function analyzePythonCode(code: string): { funcName: string | null; paramNames: string[] } {
  const match = code.match(/^def\s+(\w+)\s*\(([^)]*)\)/m);
  if (!match) return { funcName: null, paramNames: [] };

  const funcName = match[1];
  const paramsStr = match[2].trim();
  if (!paramsStr) return { funcName, paramNames: [] };

  const paramNames = paramsStr
    .split(",")
    .map((p) => p.trim().split(":")[0].split("=")[0].trim())
    .filter((p) => p && p !== "self");

  return { funcName, paramNames };
}
