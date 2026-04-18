"use client";

import { useCallback, useEffect, useState } from "react";
import type { CodeLanguage } from "@/engine";
import { getCodeLanguageAdapter } from "@/engine";

const STORAGE_KEY = "recursive-default-lang";

function readDefaultCodeLanguage(): CodeLanguage {
  if (typeof window === "undefined") return "python";
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "javascript" ? "javascript" : "python";
}

export interface UseCodeLanguage {
  codeLanguage: CodeLanguage | null;
  defaultCodeLanguage: CodeLanguage | null;
  setCodeLanguage: (lang: CodeLanguage) => void;
  setDefaultCodeLanguage: (lang: CodeLanguage) => void;
}

export function useCodeLanguage(): UseCodeLanguage {
  const [codeLanguage, setCodeLanguageState] = useState<CodeLanguage | null>(null);
  const [defaultCodeLanguage, setDefaultCodeLanguageState] = useState<CodeLanguage | null>(null);

  useEffect(() => {
    const stored = readDefaultCodeLanguage();
    setCodeLanguageState(stored);
    setDefaultCodeLanguageState(stored);
    getCodeLanguageAdapter(stored).onSelected?.();
  }, []);

  const setCodeLanguage = useCallback((lang: CodeLanguage) => {
    setCodeLanguageState(lang);
    getCodeLanguageAdapter(lang).onSelected?.();
  }, []);

  const setDefaultCodeLanguage = useCallback((lang: CodeLanguage) => {
    localStorage.setItem(STORAGE_KEY, lang);
    setDefaultCodeLanguageState(lang);
  }, []);

  return { codeLanguage, defaultCodeLanguage, setCodeLanguage, setDefaultCodeLanguage };
}
