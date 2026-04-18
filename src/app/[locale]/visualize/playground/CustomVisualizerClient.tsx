"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { StepGeneratorResult } from "@/algorithm";
import { CodeEditor, ArgumentForm } from "@/editor";
import { getCodeLanguageAdapter } from "@/engine";
import { executeCodeLazy } from "@/engine/lazy";
import type { ArgumentFormHandle } from "@/editor";
import { highlightCode } from "@/shared/lib/shiki";
import { trackEvent } from "@/shared/lib/analytics/posthog";
import { useCodeLanguage } from "@/shared/hooks/useCodeLanguage";
import { Header, StatusMessage, EmbedDropdown, CodeLanguageSelect } from "@/shared/ui";
import { ChevronLeftIcon } from "@/shared/ui/icons";
import { buildEmbedUrl } from "@/shared/lib/embed-url";
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

interface CustomVisualizerClientProps {
  initialCode?: string;
  initialArgs?: unknown[];
}

export function CustomVisualizerClient({ initialCode, initialArgs }: CustomVisualizerClientProps) {
  const t = useTranslations();
  const [code, setCode] = useState(initialCode ?? "");
  const [mode, setMode] = useState<Mode>(initialCode ? "loading" : "edit");
  const [error, setError] = useState<string | null>(null);
  const [exec, setExec] = useState<ExecState>(INITIAL_EXEC);
  const [paramNames, setParamNames] = useState<string[]>([]);
  const [hasTopLevelCall, setHasTopLevelCall] = useState(false);
  const { codeLanguage, defaultCodeLanguage, setCodeLanguage, setDefaultCodeLanguage } =
    useCodeLanguage();
  const showArgumentForm = paramNames.length > 0 && !hasTopLevelCall;
  const argFormRef = useRef<ArgumentFormHandle>(null);
  const codeRef = useRef(initialCode ?? "");
  const lastArgsRef = useRef<unknown[]>(initialArgs ?? []);
  const autoExecutedRef = useRef(false);

  useEffect(
    function autoExecuteFromUrl() {
      if (initialCode && codeLanguage && !autoExecutedRef.current) {
        autoExecutedRef.current = true;
        handleExecute(initialArgs ?? []);
      }
    },
    [codeLanguage],
  );

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    codeRef.current = newCode;
    if (!codeLanguage) return;
    getCodeLanguageAdapter(codeLanguage)
      .analyzeUsage(newCode)
      .then((usage) => {
        setParamNames(usage.paramNames);
        setHasTopLevelCall(usage.hasTopLevelCall);
      });
  };

  const handleExecute = async (args: unknown[]) => {
    if (!codeLanguage) return;
    lastArgsRef.current = args;
    setMode("loading");
    setError(null);
    try {
      const adapter = getCodeLanguageAdapter(codeLanguage);
      const cleanCode = adapter.prepareForExecution(code);
      const [execResult, html] = await Promise.all([
        executeCodeLazy(cleanCode, args, codeLanguage),
        highlightCode(cleanCode, adapter.shikiLang),
      ]);
      setExec({
        result: execResult.result,
        finalReturnValue: execResult.finalReturnValue,
        hasRecursion: execResult.hasRecursion,
        consoleLogs: execResult.consoleLogs ?? [],
        codeHtml: html,
      });
      setMode("visualize");
      trackEvent("code_executed", {
        source: "playground",
        code: cleanCode.slice(0, 500),
        language: codeLanguage,
        hasRecursion: execResult.hasRecursion,
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

  const embedUrl = useMemo(() => {
    if (!codeRef.current) return null;
    return buildEmbedUrl({ code: codeRef.current, args: lastArgsRef.current });
  }, [exec]);

  return (
    <div className={styles.page}>
      <Header
        left={<a href="/" className={styles.backLink}><ChevronLeftIcon size={14} />{t("visualizer.backToList")}</a>}
        right={
          mode === "visualize" ? (
            <>
              {embedUrl && <EmbedDropdown embedUrl={embedUrl} />}
              <button onClick={handleEdit} className={styles.editButton}>Edit</button>
            </>
          ) : undefined
        }
      />

      {(mode === "edit" || mode === "error") && (
        <div className={styles.editLayout}>
          {error && <div className={styles.errorBox}>{error}</div>}
          <div className={styles.editorCard}>
            <div className={styles.editorToolbar}>
              <CodeLanguageSelect
                value={codeLanguage}
                defaultValue={defaultCodeLanguage}
                onChange={setCodeLanguage}
                onSetDefault={setDefaultCodeLanguage}
              />
              <div className={styles.toolbarRight}>
                {showArgumentForm && (
                  <ArgumentForm
                    ref={argFormRef}
                    paramNames={paramNames}
                    onSubmit={handleExecute}
                  />
                )}
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
              <CodeEditor
                value={code}
                onChange={handleCodeChange}
                codeLanguage={codeLanguage ?? "javascript"}
              />
            </div>
          </div>
        </div>
      )}

      {mode === "loading" && <StatusMessage variant="loading">{t("custom.running")}</StatusMessage>}

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
