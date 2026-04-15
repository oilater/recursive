"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CodeEditor, ArgumentForm } from "@/editor";
import type { ArgumentFormHandle } from "@/editor";
import { analyzeCode } from "@/engine";
import { executeCustomCode } from "@/engine";
import { normalizeCode } from "@/shared/lib/normalize-code";
import * as styles from "./home.css";

export function HomeEditor() {
  const t = useTranslations();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [paramNames, setParamNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const hasCode = code.trim().length > 0;
  const argFormRef = useRef<ArgumentFormHandle>(null);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setError(null);
    try {
      const { analysis } = analyzeCode(newCode);
      setParamNames(analysis.entryParamNames);
    } catch {}
  };

  const handleRun = async (args: unknown[]) => {
    setError(null);
    setRunning(true);
    try {
      const cleanCode = normalizeCode(code);
      await executeCustomCode(cleanCode, args);
      const encoded = btoa(unescape(encodeURIComponent(cleanCode)));
      const argsStr = args.length > 0 ? `&args=${encodeURIComponent(JSON.stringify(args))}` : "";
      router.push(`/visualize/run?code=${encodeURIComponent(encoded)}${argsStr}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setRunning(false);
    }
  };

  return (
    <div>
      <div className={styles.actionBar}>
        {error && <span className={styles.errorText}>{error}</span>}
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

      <div className={styles.editorCard}>
        <div className={styles.editorBody}>
          <CodeEditor value={code} onChange={handleCodeChange} />
        </div>
      </div>
    </div>
  );
}
