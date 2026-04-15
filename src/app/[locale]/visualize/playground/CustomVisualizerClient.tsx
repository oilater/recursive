"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import type { StepGeneratorResult } from "@/algorithm";
import { CodeEditor, ArgumentForm } from "@/editor";
import { executeCustomCode, analyzeCode } from "@/engine";
import type { ArgumentFormHandle } from "@/editor";
import { highlightCode } from "@/shared/lib/shiki";
import { normalizeCode } from "@/shared/lib/normalize-code";
import { trackEvent } from "@/shared/lib/posthog";
import { Header } from "@/shared/ui";
import { ChevronLeftIcon } from "@/shared/ui/icons";
import { PlaygroundViewer } from "./PlaygroundViewer";
import * as styles from "./custom-page.css";

type Mode = "edit" | "loading" | "visualize" | "error";

interface ExecState {
  result: StepGeneratorResult | null;
  finalReturnValue: unknown;
  hasRecursion: boolean;
  consoleLogs: Array<{ text: string; stepIdx: number }>;
  codeHtml: string;
}

const INITIAL_EXEC: ExecState = {
  result: null,
  finalReturnValue: undefined,
  hasRecursion: true,
  consoleLogs: [],
  codeHtml: "",
};

export function CustomVisualizerClient() {
  const t = useTranslations();
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<Mode>("edit");
  const [error, setError] = useState<string | null>(null);
  const [exec, setExec] = useState<ExecState>(INITIAL_EXEC);
  const [paramNames, setParamNames] = useState<string[]>([]);
  const argFormRef = useRef<ArgumentFormHandle>(null);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    try {
      const { analysis } = analyzeCode(newCode);
      setParamNames(analysis.entryParamNames);
    } catch {}
  };

  const handleExecute = async (args: unknown[]) => {
    setMode("loading");
    setError(null);
    try {
      const cleanCode = normalizeCode(code);
      const [execResult, html] = await Promise.all([
        executeCustomCode(cleanCode, args),
        highlightCode(cleanCode),
      ]);
      setExec({
        result: execResult.result,
        finalReturnValue: execResult.finalReturnValue,
        hasRecursion: execResult.analysis.hasRecursion,
        consoleLogs: execResult.consoleLogs ?? [],
        codeHtml: html,
      });
      setMode("visualize");
      trackEvent("code_executed", {
        source: "playground",
        code: cleanCode.slice(0, 500),
        hasRecursion: execResult.analysis.hasRecursion,
        stepCount: execResult.result.steps.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setMode("error");
    }
  };

  const handleEdit = () => {
    setMode("edit");
    setExec(INITIAL_EXEC);
    setError(null);
  };

  return (
    <div className={styles.page}>
      <Header
        left={<a href="/" className={styles.backLink}><ChevronLeftIcon size={14} />{t("visualizer.backToList")}</a>}
        right={
          mode === "visualize" ? (
            <button onClick={handleEdit} className={styles.editButton}>Edit</button>
          ) : undefined
        }
      />

      {(mode === "edit" || mode === "error") && (
        <div className={styles.editLayout}>
          {error && <div className={styles.errorBox}>{error}</div>}
          <div className={styles.editorCard}>
            <div className={styles.editorToolbar}>
              <span className={styles.toolbarBadge}>{t("custom.langLabel")}</span>
              <span className={styles.toolbarLabel}>{t("custom.langList")}</span>
              <div className={styles.toolbarRight}>
                <ArgumentForm ref={argFormRef} paramNames={paramNames} onSubmit={handleExecute} />
                <button
                  className={styles.runButton}
                  onClick={() => {
                    const args = argFormRef.current?.getArgs() ?? [];
                    handleExecute(args);
                  }}
                  disabled={!code.trim()}
                >
                  {t("custom.run")}
                </button>
              </div>
            </div>
            <div className={styles.editorBody}>
              <CodeEditor value={code} onChange={handleCodeChange} />
            </div>
          </div>
        </div>
      )}

      {mode === "loading" && <div className={styles.loadingOverlay}>{t("custom.running")}</div>}

      {mode === "visualize" && exec.result && (
        <PlaygroundViewer
          result={exec.result}
          codeHtml={exec.codeHtml}
          hasRecursion={exec.hasRecursion}
          finalReturnValue={exec.finalReturnValue}
          consoleLogs={exec.consoleLogs}
        />
      )}
    </div>
  );
}
