"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import type { StepGeneratorResult } from "@/algorithm";
import { useAlgorithmPlayer } from "@/player";
import {
  TreeView,
  StepperControls,
  VariablePanel,
  CallStack,
  ResultPanel,
  CodePanel,
} from "@/visualizer";
import { CodeEditor, ArgumentForm } from "@/editor";
import { executeCustomCode, analyzeCode } from "@/engine";
import type { ArgumentFormHandle } from "@/editor";
import { highlightCode } from "@/shared/lib/shiki";
import { normalizeCode } from "@/shared/lib/normalize-code";
import { trackEvent } from "@/shared/lib/posthog";
import { Header } from "@/shared/ui";
import * as styles from "./custom-page.css";

const DEFAULT_CODE = "";

type Mode = "edit" | "loading" | "visualize" | "error";

export function CustomVisualizerClient() {
  const t = useTranslations();
  const [code, setCode] = useState(DEFAULT_CODE);
  const [mode, setMode] = useState<Mode>("edit");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StepGeneratorResult | null>(null);
  const [finalReturnValue, setFinalReturnValue] = useState<unknown>(undefined);
  const [hasRecursion, setHasRecursion] = useState(true);
  const [consoleLogs, setConsoleLogs] = useState<Array<{ text: string; stepIdx: number }>>([]);
  const [codeHtml, setCodeHtml] = useState<string>("");
  const [paramNames, setParamNames] = useState<string[]>([]);
  const argsRef = useRef<unknown[]>([]);
  const argFormRef = useRef<ArgumentFormHandle>(null);

  const player = useAlgorithmPlayer(result?.steps ?? []);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    try {
      const { analysis } = analyzeCode(newCode);
      setParamNames(analysis.entryParamNames);
    } catch {}
  };

  const handleExecute = async (args: unknown[]) => {
    argsRef.current = args;
    setMode("loading");
    setError(null);
    try {
      const cleanCode = normalizeCode(code);
      const execResult = await executeCustomCode(cleanCode, args);
      setResult(execResult.result);
      setFinalReturnValue(execResult.finalReturnValue);
      setHasRecursion(execResult.analysis.hasRecursion);
      setConsoleLogs(execResult.consoleLogs ?? []);
      const html = await highlightCode(cleanCode);
      setCodeHtml(html);
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
    setResult(null);
    setError(null);
  };

  return (
    <div className={styles.page}>
      <Header
        left={<a href="/" className={styles.backLink}>← Recursive</a>}
        right={
          mode === "visualize" ? (
            <button onClick={handleEdit} className={styles.editButton}>Edit</button>
          ) : undefined
        }
      />

      {(mode === "edit" || mode === "error") && (
        <div className={styles.editLayout}>
          {error && <div className={styles.errorBox}>{error}</div>}
          <div className={styles.hintBanner}>{t("custom.hint")}</div>
          <div className={styles.editorPanel}>
            <CodeEditor value={code} onChange={handleCodeChange} />
          </div>
          <div className={styles.argsPanel}>
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
      )}

      {mode === "loading" && <div className={styles.loadingOverlay}>{t("custom.running")}</div>}

      {mode === "visualize" && result && (
        <div className={styles.vizContainer}>
          <div className={styles.vizRow}>
            <div className={styles.leftPanel}>
              <div className={styles.codeSection}>
                <CodePanel html={codeHtml} activeLine={player.currentStep?.codeLine} />
              </div>
            </div>

            <div className={styles.middlePanel}>
              {hasRecursion && <CallStack currentStep={player.currentStep} tree={result.tree} />}
              <div className={styles.variableSection}>
                <VariablePanel
                  currentStep={player.currentStep}
                  prevStep={
                    player.currentIndex > 0 ? result.steps[player.currentIndex - 1] : undefined
                  }
                />
              </div>
              <ResultPanel
                steps={result.steps}
                currentIndex={player.currentIndex}
                finalReturnValue={finalReturnValue}
                consoleLogs={consoleLogs}
              />
            </div>

            {hasRecursion && (
              <div className={styles.rightPanel}>
                <div className={styles.treeSection}>
                  <TreeView tree={result.tree} currentStep={player.currentStep} />
                </div>
              </div>
            )}
          </div>

          <div className={styles.bottomPanel}>
            <StepperControls player={player} />
          </div>
        </div>
      )}
    </div>
  );
}
