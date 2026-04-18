/**
 * Lightweight Python code analysis (client-side, no Pyodide needed).
 * Extracts function name, parameter names, and whether the function
 * is called at the top level of the source.
 */
export interface PythonAnalysis {
  funcName: string | null;
  paramNames: string[];
  hasTopLevelCall: boolean;
}

export function analyzePythonCode(code: string): PythonAnalysis {
  const match = code.match(/^def\s+(\w+)\s*\(([^)]*)\)/m);
  if (!match) return { funcName: null, paramNames: [], hasTopLevelCall: false };

  const funcName = match[1];
  const paramsStr = match[2].trim();
  const paramNames = paramsStr
    ? paramsStr
        .split(",")
        .map((p) => p.trim().split(":")[0].split("=")[0].trim())
        .filter((p) => p && p !== "self")
    : [];

  const hasTopLevelCall = hasTopLevelCallTo(code, funcName);

  return { funcName, paramNames, hasTopLevelCall };
}

function hasTopLevelCallTo(code: string, funcName: string): boolean {
  const callPattern = new RegExp(`\\b${funcName}\\s*\\(`);
  for (const line of code.split("\n")) {
    if (/^\s/.test(line)) continue; // indented = inside def/class
    if (/^\s*def\s/.test(line)) continue;
    if (/^\s*class\s/.test(line)) continue;
    if (/^\s*#/.test(line)) continue;
    if (callPattern.test(line)) return true;
  }
  return false;
}

/**
 * Strip `self` parameter from all def signatures in Python code.
 */
export function stripSelfParam(code: string): string {
  return code.replace(/^(\s*def\s+\w+\s*)\(\s*self\s*,?\s*/gm, (_, prefix) => `${prefix}(`);
}
