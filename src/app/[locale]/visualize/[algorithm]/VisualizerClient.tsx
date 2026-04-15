"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { StepGeneratorResult, PresetAlgorithm } from "@/algorithm";
import { useAlgorithmPlayer } from "@/player";
import {
  TreeView,
  StepperControls,
  VariablePanel,
  CallStack,
  ResultPanel,
  CodePanel,
} from "@/visualizer";
import { ArgumentForm } from "@/editor";
import { executeCustomCode, analyzeCode } from "@/engine";
import type { ArgumentFormHandle } from "@/editor";
import { trackEvent } from "@/shared/lib/posthog";
import { highlightCode } from "@/shared/lib/shiki";
import { Badge, Header } from "@/shared/ui";
import { ChevronLeftIcon } from "@/shared/ui/icons";
import * as styles from "./visualize-page.css";

interface VisualizerClientProps {
  preset: PresetAlgorithm;
}

export function VisualizerClient({ preset }: VisualizerClientProps) {
  const t = useTranslations();
  const [result, setResult] = useState<StepGeneratorResult | null>(null);
  const [codeHtml, setCodeHtml] = useState("");
  const [hasRecursion, setHasRecursion] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paramNames, setParamNames] = useState<string[]>([]);
  const argFormRef = useRef<ArgumentFormHandle>(null);

  const player = useAlgorithmPlayer(result?.steps ?? []);
  const prevStep =
    player.currentIndex > 0 ? (result?.steps[player.currentIndex - 1] ?? undefined) : undefined;

  useEffect(
    function analyzePresetParams() {
      try {
        const { analysis } = analyzeCode(preset.code);
        setParamNames(analysis.entryParamNames);
      } catch {}
    },
    [preset.code],
  );

  const runCode = async (args: unknown[]) => {
    setError(null);
    try {
      const [execResult, html] = await Promise.all([
        executeCustomCode(preset.code, args),
        highlightCode(preset.code),
      ]);
      setResult(execResult.result);
      setHasRecursion(execResult.analysis.hasRecursion);
      setCodeHtml(html);
      trackEvent("code_executed", {
        source: "preset",
        presetId: preset.id,
        args: JSON.stringify(args),
        stepCount: execResult.result.steps.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(
    function executeInitial() {
      runCode(preset.defaultArgs);
    },
    [preset],
  );

  const presetHeader = (
    <Header
      left={<a href="/" className={styles.backLink}><ChevronLeftIcon size={14} />{t("visualizer.backToList")}</a>}
      center={
        <>
          <span className={styles.algoTitle}>{t(`algorithm.${preset.id}.name`)}</span>
          <Badge variant={preset.difficulty}>{t(`difficulty.${preset.difficulty}`)}</Badge>
        </>
      }
    />
  );

  if (error) {
    return (
      <div className={styles.page}>
        {presetHeader}
        <div style={{ padding: "32px", color: "#ef4444" }}>{error}</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className={styles.page}>
        {presetHeader}
        <div style={{ padding: "32px", color: "#94a3b8" }}>{t("visualizer.running")}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {presetHeader}

      <div className={styles.mainContent} style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", flex: 1, overflow: "hidden", gap: "16px" }}>
          <div className={styles.leftPanel} style={{ flex: 3, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 14px",
                backgroundColor: "#1a1a24",
                borderRadius: "8px 8px 0 0",
                border: "1px solid #2e2e48",
                borderBottom: "none",
                fontSize: "13px",
                fontFamily: "var(--font-mono)",
              }}
            >
              <div style={{ flex: 1 }} />
              <ArgumentForm ref={argFormRef} paramNames={paramNames} defaultArgs={preset.defaultArgs} onSubmit={runCode} />
              <button
                onClick={() => {
                  const args = argFormRef.current?.getArgs() ?? preset.defaultArgs;
                  runCode(args);
                }}
                style={{
                  padding: "4px 14px",
                  backgroundColor: "#065f46",
                  color: "#6ee7b7",
                  border: "1px solid #047857",
                  borderRadius: "4px",
                  fontSize: "12px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontWeight: 500,
                }}
              >
                {t("visualizer.apply")}
              </button>
            </div>
            <div className={styles.codeSection}>
              <CodePanel html={codeHtml} activeLine={player.currentStep?.codeLine} />
            </div>
          </div>

          <div className={styles.middlePanel}>
            {hasRecursion && <CallStack currentStep={player.currentStep} tree={result.tree} />}
            <div className={styles.variableSection}>
              <VariablePanel currentStep={player.currentStep} prevStep={prevStep} />
            </div>
            <ResultPanel steps={result.steps} currentIndex={player.currentIndex} />
          </div>

          {hasRecursion && (
            <div className={styles.rightPanel} style={{ flex: 2, minWidth: 0 }}>
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
    </div>
  );
}
