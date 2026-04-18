"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CodeEditor, ArgumentForm } from "@/editor";
import type { ArgumentFormHandle } from "@/editor";
import { getCodeLanguageAdapter } from "@/engine";
import type { CodeLanguage } from "@/engine";
import { useCodeLanguage } from "@/shared/hooks/useCodeLanguage";
import { CodeLanguageSelect } from "@/shared/ui";
import * as styles from "./home.css";

export function HomeEditor() {
  const t = useTranslations();
  const router = useRouter();
  const { codeLanguage, defaultCodeLanguage, setCodeLanguage, setDefaultCodeLanguage } =
    useCodeLanguage();

  const [code, setCode] = useState("");
  const [paramNames, setParamNames] = useState<string[]>([]);
  const [hasTopLevelCall, setHasTopLevelCall] = useState(false);

  const hasCode = code.trim().length > 0;
  const showArgumentForm = paramNames.length > 0 && !hasTopLevelCall;
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
    if (codeLanguage) {
      const usage = getCodeLanguageAdapter(codeLanguage).analyzeUsage(newCode);
      setParamNames(usage.paramNames);
      setHasTopLevelCall(usage.hasTopLevelCall);
    }
  };

  const handleRun = (args: unknown[]) => {
    if (!codeLanguage) return;
    const cleanCode = getCodeLanguageAdapter(codeLanguage).prepareForExecution(code);
    const encoded = btoa(unescape(encodeURIComponent(cleanCode)));
    const argsStr = args.length > 0 ? `&args=${encodeURIComponent(JSON.stringify(args))}` : "";
    const langStr = codeLanguage === "python" ? `&lang=python` : "";
    router.push(`/visualize/run?code=${encodeURIComponent(encoded)}${argsStr}${langStr}`);
  };

  return (
    <div>
      <div className={styles.actionBar}>
        <CodeLanguageSelect
          value={codeLanguage}
          defaultValue={defaultCodeLanguage}
          onChange={handleCodeLanguageChange}
          onSetDefault={setDefaultCodeLanguage}
        />
        <div className={styles.actionRight}>
          {showArgumentForm && (
            <ArgumentForm ref={argFormRef} paramNames={paramNames} onSubmit={handleRun} />
          )}
          <button
            className={styles.runButton}
            onClick={() => {
              const args = argFormRef.current?.getArgs() ?? [];
              handleRun(args);
            }}
            disabled={!hasCode || !codeLanguage}
          >
            {t("custom.run")}
          </button>
        </div>
      </div>

      <div className={styles.editorCard} ref={editorRef}>
        <div className={styles.editorBody}>
          <CodeEditor
            value={code}
            onChange={handleCodeChange}
            codeLanguage={codeLanguage ?? "javascript"}
          />
        </div>
      </div>
    </div>
  );
}
