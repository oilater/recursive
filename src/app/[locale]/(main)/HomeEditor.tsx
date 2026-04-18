"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CodeEditor, ArgumentForm } from "@/editor";
import type { ArgumentFormHandle } from "@/editor";
import { analyzeCode, analyzePythonCode, executeCode, ensurePyodideWorker } from "@/engine";
import type { CodeLanguage } from "@/engine";
import { normalizeCode } from "@/shared/lib/normalize-code";
import { CodeLanguageSelect, getDefaultCodeLanguage } from "@/shared/ui/CodeLanguageSelect";
import * as styles from "./home.css";

export function HomeEditor() {
  const t = useTranslations();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage | null>(null);

  useEffect(() => {
    setCodeLanguage(getDefaultCodeLanguage());
  }, []);
  const [paramNames, setParamNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(
    function preloadPyodide() {
      if (codeLanguage === "python") {
        ensurePyodideWorker().catch(() => {});
      }
    },
    [],
  );
  const hasCode = code.trim().length > 0;
  const argFormRef = useRef<ArgumentFormHandle>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const handleCodeLanguageChange = (lang: CodeLanguage) => {
    setCodeLanguage(lang);
    setTimeout(() => {
      const cm = editorRef.current?.querySelector(".cm-content") as HTMLElement | null;
      cm?.focus();
    }, 0);
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setError(null);
    if (codeLanguage === "javascript") {
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
    if (!codeLanguage) return;
    setError(null);
    setRunning(true);
    try {
      const cleanCode = codeLanguage === "javascript" ? normalizeCode(code) : code;
      await executeCode(cleanCode, args, codeLanguage);
      const encoded = btoa(unescape(encodeURIComponent(cleanCode)));
      const argsStr = args.length > 0 ? `&args=${encodeURIComponent(JSON.stringify(args))}` : "";
      const langStr = codeLanguage === "python" ? `&lang=python` : "";
      router.push(`/visualize/run?code=${encodeURIComponent(encoded)}${argsStr}${langStr}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setRunning(false);
    }
  };

  return (
    <div>
      <div className={styles.actionBar}>
        <CodeLanguageSelect value={codeLanguage} onChange={handleCodeLanguageChange} />
        {error && <span className={styles.errorText}>{error}</span>}
        <div className={styles.actionRight}>
          <ArgumentForm ref={argFormRef} paramNames={paramNames} onSubmit={handleRun} />
          <button
            className={styles.runButton}
            onClick={() => {
              const args = argFormRef.current?.getArgs() ?? [];
              handleRun(args);
            }}
            disabled={!hasCode || running || !codeLanguage}
          >
            {running ? "..." : t("custom.run")}
          </button>
        </div>
      </div>

      <div className={styles.editorCard} ref={editorRef}>
        <div className={styles.editorBody}>
          <CodeEditor value={code} onChange={handleCodeChange} codeLanguage={codeLanguage ?? "javascript"} />
        </div>
      </div>
    </div>
  );
}
