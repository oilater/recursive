import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { analyzeCode } from "./analyzer";
import { analyzePythonCode, ensurePyodideWorker } from "./python";
import { normalizeCode } from "@/shared/lib/normalize-code";
import type { CodeLanguage } from "./types";

type EditorExtension = ReturnType<typeof javascript>;

export interface UsageInfo {
  paramNames: string[];
  hasTopLevelCall: boolean;
}

export interface CodeLanguageAdapter {
  id: CodeLanguage;
  label: string;
  shikiLang: "javascript" | "python";
  editorExtension: () => EditorExtension;
  analyzeUsage: (code: string) => UsageInfo;
  prepareForExecution: (code: string) => string;
  onSelected?: () => void;
}

const EMPTY_USAGE: UsageInfo = { paramNames: [], hasTopLevelCall: false };

const ADAPTERS: Record<CodeLanguage, CodeLanguageAdapter> = {
  javascript: {
    id: "javascript",
    label: "JS / TS",
    shikiLang: "javascript",
    editorExtension: () => javascript({ typescript: true }),
    analyzeUsage: (code) => {
      try {
        const { analysis } = analyzeCode(code);
        return {
          paramNames: analysis.entryParamNames,
          hasTopLevelCall: analysis.hasTopLevelCall,
        };
      } catch {
        return EMPTY_USAGE;
      }
    },
    prepareForExecution: normalizeCode,
  },
  python: {
    id: "python",
    label: "Python",
    shikiLang: "python",
    editorExtension: () => python(),
    analyzeUsage: (code) => {
      const { paramNames, hasTopLevelCall } = analyzePythonCode(code);
      return { paramNames, hasTopLevelCall };
    },
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
