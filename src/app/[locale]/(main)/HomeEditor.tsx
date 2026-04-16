"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CodeEditor, ArgumentForm } from "@/editor";
import type { ArgumentFormHandle } from "@/editor";
import { analyzeCode, analyzePythonCode, executeCode } from "@/engine";
import type { Language } from "@/engine";
import { normalizeCode } from "@/shared/lib/normalize-code";
import { LanguageSelect, getDefaultLanguage } from "@/shared/ui/LanguageSelect";
import * as styles from "./home.css";

export function HomeEditor() {
  const t = useTranslations();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<Language>(getDefaultLanguage);
  const [paramNames, setParamNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const hasCode = code.trim().length > 0;
  const argFormRef = useRef<ArgumentFormHandle>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setTimeout(() => {
      const cm = editorRef.current?.querySelector(".cm-content") as HTMLElement | null;
      cm?.focus();
    }, 0);
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setError(null);
    if (language === "javascript") {
      try {
        const { analysis } = analyzeCode(newCode);
        setParamNames(analysis.entryParamNames);
      } catch {}
    } else {
      const { paramNames: pyParams } = analyzePythonCode(newCode);
      setParamNames(pyParams);
    }
  };

  const handleRun = async (args: unknown[]) => {
    setError(null);
    setRunning(true);
    try {
      const cleanCode = language === "javascript" ? normalizeCode(code) : code;
      await executeCode(cleanCode, args, language);
      const encoded = btoa(unescape(encodeURIComponent(cleanCode)));
      const argsStr = args.length > 0 ? `&args=${encodeURIComponent(JSON.stringify(args))}` : "";
      const langStr = language === "python" ? `&lang=python` : "";
      router.push(`/visualize/run?code=${encodeURIComponent(encoded)}${argsStr}${langStr}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setRunning(false);
    }
  };

  return (
    <div>
      <div className={styles.actionBar}>
        <LanguageSelect value={language} onChange={handleLanguageChange} />
        {error && <span className={styles.errorText}>{error}</span>}
        <div className={styles.actionRight}>
          <ArgumentForm ref={argFormRef} paramNames={paramNames} onSubmit={handleRun} />
          <button
            className={styles.runButton}
            onClick={() => {
              const args = argFormRef.current?.getArgs() ?? [];
              handleRun(args);
            }}
            disabled={!hasCode || running}
          >
            {running ? "..." : t("custom.run")}
          </button>
        </div>
      </div>

      <div className={styles.editorCard} ref={editorRef}>
        <div className={styles.editorBody}>
          <CodeEditor value={code} onChange={handleCodeChange} language={language} />
        </div>
      </div>
    </div>
  );
}
