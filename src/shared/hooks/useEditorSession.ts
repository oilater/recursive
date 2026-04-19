"use client";

import { useEffect, useState } from "react";
import { getCodeLanguageAdapter } from "@/engine";
import type { CodeLanguage } from "@/engine";
import {
  loadEditorSession,
  saveEditorSession,
} from "@/shared/lib/editor-session-storage";

interface UseEditorSessionOptions {
  currentLanguage: CodeLanguage | null;
  onLanguageRestored?: (lang: CodeLanguage) => void;
}

export interface EditorSession {
  code: string;
  paramNames: string[];
  hasTopLevelCall: boolean;
  restoredArgs: unknown[] | undefined;
  onCodeChange: (newCode: string) => void;
  resetForLanguage: (lang: CodeLanguage) => void;
  persistForRun: (args: unknown[]) => void;
}

export function useEditorSession({
  currentLanguage,
  onLanguageRestored,
}: UseEditorSessionOptions): EditorSession {
  const [code, setCode] = useState("");
  const [paramNames, setParamNames] = useState<string[]>([]);
  const [hasTopLevelCall, setHasTopLevelCall] = useState(false);
  const [restoredArgs, setRestoredArgs] = useState<unknown[] | undefined>(undefined);

  useEffect(() => {
    const saved = loadEditorSession();
    if (!saved) return;
    onLanguageRestored?.(saved.codeLanguage);
    setCode(saved.code);
    setRestoredArgs(saved.args);
    getCodeLanguageAdapter(saved.codeLanguage)
      .analyzeUsage(saved.code)
      .then((usage) => {
        setParamNames(usage.paramNames);
        setHasTopLevelCall(usage.hasTopLevelCall);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCodeChange = (newCode: string) => {
    setCode(newCode);
    if (!currentLanguage) return;
    saveEditorSession({ code: newCode, codeLanguage: currentLanguage });
    getCodeLanguageAdapter(currentLanguage)
      .analyzeUsage(newCode)
      .then((usage) => {
        setParamNames(usage.paramNames);
        setHasTopLevelCall(usage.hasTopLevelCall);
      });
  };

  const resetForLanguage = (lang: CodeLanguage) => {
    setCode("");
    setParamNames([]);
    setHasTopLevelCall(false);
    setRestoredArgs(undefined);
    saveEditorSession({ code: "", codeLanguage: lang });
  };

  const persistForRun = (args: unknown[]) => {
    if (!currentLanguage) return;
    saveEditorSession({ code, codeLanguage: currentLanguage, args });
  };

  return {
    code,
    paramNames,
    hasTopLevelCall,
    restoredArgs,
    onCodeChange,
    resetForLanguage,
    persistForRun,
  };
}
