import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { analyzeCode } from "./analyzer";
import { analyzePythonCode, ensurePyodideWorker } from "./python";
import { normalizeCode } from "@/shared/lib/normalize-code";
import type { CodeLanguage } from "./types";

type EditorExtension = ReturnType<typeof javascript>;

export interface CodeLanguageAdapter {
  id: CodeLanguage;
  label: string;
  shikiLang: "javascript" | "python";
  editorExtension: () => EditorExtension;
  analyzeParamNames: (code: string) => string[];
  prepareForExecution: (code: string) => string;
  onSelected?: () => void;
}

const ADAPTERS: Record<CodeLanguage, CodeLanguageAdapter> = {
  javascript: {
    id: "javascript",
    label: "JS / TS",
    shikiLang: "javascript",
    editorExtension: () => javascript({ typescript: true }),
    analyzeParamNames: (code) => {
      try {
        return analyzeCode(code).analysis.entryParamNames;
      } catch {
        return [];
      }
    },
    prepareForExecution: normalizeCode,
  },
  python: {
    id: "python",
    label: "Python",
    shikiLang: "python",
    editorExtension: () => python(),
    analyzeParamNames: (code) => analyzePythonCode(code).paramNames,
    prepareForExecution: (code) => code,
    onSelected: () => {
      ensurePyodideWorker().catch(() => {});
    },
  },
};

export function getCodeLanguageAdapter(codeLanguage: CodeLanguage): CodeLanguageAdapter {
  return ADAPTERS[codeLanguage];
}

export function listCodeLanguageAdapters(): CodeLanguageAdapter[] {
  return Object.values(ADAPTERS);
}
