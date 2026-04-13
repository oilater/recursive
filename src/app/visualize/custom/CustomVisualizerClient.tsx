"use client";

import { useState, useRef } from "react";
import type { StepGeneratorResult } from "@/entities/algorithm";
import { useAlgorithmPlayer } from "@/features/player";
import { TreeView, StepperControls, VariablePanel, CallStack, ResultPanel, CodePanel } from "@/features/visualizer";
import { CodeEditor, ArgumentForm, executeCustomCode, analyzeCode } from "@/features/custom-code";
import type { ArgumentFormHandle } from "@/features/custom-code";
import { highlightCode } from "@/shared/lib/shiki";
import { PanelHeader, ResizeHandle } from "@/shared/ui";
import * as styles from "./custom-page.css";

const DEFAULT_CODE = "";

type Mode = "edit" | "loading" | "visualize" | "error";

export function CustomVisualizerClient() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [mode, setMode] = useState<Mode>("edit");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StepGeneratorResult | null>(null);
  const [finalReturnValue, setFinalReturnValue] = useState<unknown>(undefined);
  const [hasRecursion, setHasRecursion] = useState(true);
  const [consoleLogs, setConsoleLogs] = useState<Array<{ text: string; stepIdx: number }>>([]);
  const [codeHtml, setCodeHtml] = useState<string>("");
  const [paramNames, setParamNames] = useState<string[]>([]);
  const [leftWidth, setLeftWidth] = useState(440);
  const argsRef = useRef<unknown[]>([]);
  const argFormRef = useRef<ArgumentFormHandle>(null);

  const player = useAlgorithmPlayer(result?.steps ?? []);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    try {
      const { analysis } = analyzeCode(newCode);
      setParamNames(analysis.entryParamNames);
    } catch {
      // 편집 중에는 파싱 에러 무시
    }
  };

  const handleExecute = async (args: unknown[]) => {
    argsRef.current = args;
    setMode("loading");
    setError(null);
    try {
      const execResult = await executeCustomCode(code, args);
      setResult(execResult.result);
      setFinalReturnValue(execResult.finalReturnValue);
      setHasRecursion(execResult.analysis.hasRecursion);
      setConsoleLogs(execResult.consoleLogs ?? []);
      const html = await highlightCode(code);
      setCodeHtml(html);
      setMode("visualize");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setMode("error");
    }
  };

  const handleResize = (delta: number) => setLeftWidth((w) => Math.max(280, Math.min(600, w + delta)));

  const handleEdit = () => {
    setMode("edit");
    setResult(null);
    setError(null);
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <a href="/" className={styles.backLink}>
          ← 목록
        </a>
        {mode === "visualize" && (
          <button className={styles.backLink} onClick={handleEdit} style={{ marginLeft: "auto" }}>
            ← 코드 편집
          </button>
        )}
      </div>

      {/* Edit mode */}
      {(mode === "edit" || mode === "error") && (
        <div className={styles.editLayout}>
          <div className={styles.editorPanel}>
            <div className={styles.editorFullHeight}>
              <PanelHeader title="코드" />
              <div style={{ flex: 1, minHeight: 0 }}>
                <CodeEditor value={code} onChange={handleCodeChange} />
              </div>
            </div>
          </div>
          <div className={styles.argsPanel}>
            {error && <div className={styles.errorBox}>{error}</div>}
            <div style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "flex-end" }}>
              <ArgumentForm ref={argFormRef} paramNames={paramNames} onSubmit={handleExecute} />
              <button
                className={styles.runButton}
                onClick={() => {
                  const args = argFormRef.current?.getArgs() ?? [];
                  handleExecute(args);
                }}
                disabled={!code.trim()}
              >
                실행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {mode === "loading" && <div className={styles.loadingOverlay}>실행 중...</div>}

      {/* Visualize mode */}
      {mode === "visualize" && result && (
        <div className={styles.vizContainer}>
          <div className={styles.vizRow}>
            {/* Col 1: 코드 */}
            <div className={styles.leftPanel} style={{ width: `${leftWidth}px`, minWidth: "240px", maxWidth: "500px" }}>
              <div className={styles.codeSection}>
                <CodePanel html={codeHtml} activeLine={player.currentStep?.codeLine} />
              </div>
            </div>

            <ResizeHandle direction="horizontal" onResize={handleResize} />

            {/* Col 2: 상태 */}
            <div className={styles.middlePanel}>
              {hasRecursion && <CallStack currentStep={player.currentStep} tree={result.tree} />}
              <div className={styles.variableSection}>
                <VariablePanel
                  currentStep={player.currentStep}
                  prevStep={player.currentIndex > 0 ? result.steps[player.currentIndex - 1] : undefined}
                />
              </div>
              <ResultPanel
                steps={result.steps}
                currentIndex={player.currentIndex}
                finalReturnValue={finalReturnValue}
                consoleLogs={consoleLogs}
              />
            </div>

            {/* Col 3: 트리 (재귀가 있을 때만) */}
            {hasRecursion && (
              <div className={styles.rightPanel} style={{ flex: 1 }}>
                <div className={styles.treeSection}>
                  <TreeView tree={result.tree} currentStep={player.currentStep} />
                </div>
              </div>
            )}
          </div>

          {/* Bottom */}
          <div className={styles.bottomPanel}>
            <StepperControls player={player} />
          </div>
        </div>
      )}
    </div>
  );
}
