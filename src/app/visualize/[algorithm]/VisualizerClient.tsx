"use client";

import { useState, useEffect, useRef } from "react";
import type { StepGeneratorResult, PresetAlgorithm } from "@/entities/algorithm";
import { useAlgorithmPlayer } from "@/features/player";
import { TreeView, StepperControls, VariablePanel, CallStack, ResultPanel, CodePanel } from "@/features/visualizer";
import { executeCustomCode, analyzeCode, ArgumentForm } from "@/features/custom-code";
import type { ArgumentFormHandle } from "@/features/custom-code";
import { highlightCode } from "@/shared/lib/shiki";
import { Badge } from "@/shared/ui";
import * as styles from "./visualize-page.css";

const difficultyLabels: Record<string, string> = { easy: "쉬움", medium: "보통", hard: "어려움" };

interface VisualizerClientProps {
  preset: PresetAlgorithm;
}

export function VisualizerClient({ preset }: VisualizerClientProps) {
  const [result, setResult] = useState<StepGeneratorResult | null>(null);
  const [codeHtml, setCodeHtml] = useState("");
  const [hasRecursion, setHasRecursion] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paramNames, setParamNames] = useState<string[]>([]);
  const argFormRef = useRef<ArgumentFormHandle>(null);

  const player = useAlgorithmPlayer(result?.steps ?? []);
  const prevStep = player.currentIndex > 0 ? (result?.steps[player.currentIndex - 1] ?? undefined) : undefined;

  // 초기 파라미터 분석
  useEffect(
    function analyzePresetParams() {
      try {
        const { analysis } = analyzeCode(preset.code);
        setParamNames(analysis.entryParamNames);
      } catch {
        // ignore
      }
    },
    [preset.code]
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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // 초기 실행
  useEffect(
    function executeInitial() {
      runCode(preset.defaultArgs);
    },
    [preset]
  );

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <a href="/" className={styles.backLink}>← 목록</a>
          <span className={styles.algoTitle}>{preset.name}</span>
        </div>
        <div style={{ padding: "32px", color: "#ef4444" }}>{error}</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <a href="/" className={styles.backLink}>← 목록</a>
          <span className={styles.algoTitle}>{preset.name}</span>
        </div>
        <div style={{ padding: "32px", color: "#94a3b8" }}>실행 중...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <a href="/" className={styles.backLink}>← 목록</a>
        <span className={styles.algoTitle}>{preset.name}</span>
        <Badge variant={preset.difficulty}>{difficultyLabels[preset.difficulty]}</Badge>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          <ArgumentForm ref={argFormRef} paramNames={paramNames} onSubmit={runCode} />
          <button
            onClick={() => {
              const args = argFormRef.current?.getArgs() ?? preset.defaultArgs;
              runCode(args);
            }}
            style={{
              padding: "4px 16px",
              backgroundColor: "#4ade80",
              color: "#0a0a0a",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            실행
          </button>
        </div>
      </div>

      <div className={styles.mainContent} style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", flex: 1, overflow: "hidden", gap: "16px" }}>
          <div className={styles.leftPanel} style={{ flex: 3, minWidth: 0 }}>
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
