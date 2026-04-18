import type { CodeLanguage } from "@/engine";

const KEY = "recursive.editor";

export interface EditorSessionState {
  code: string;
  codeLanguage: CodeLanguage;
  args?: unknown[];
}

export function saveEditorSession(state: EditorSessionState): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

export function loadEditorSession(): EditorSessionState | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EditorSessionState;
    if (typeof parsed?.code !== "string") return null;
    if (parsed.codeLanguage !== "javascript" && parsed.codeLanguage !== "python") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearEditorSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
