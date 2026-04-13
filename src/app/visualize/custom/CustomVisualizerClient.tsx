"use client";

import { useState, useRef } from "react";
import type { StepGeneratorResult } from "@/entities/algorithm";
import { useAlgorithmPlayer } from "@/features/player";
import { TreeView, StepperControls, VariablePanel, CallStack, ResultPanel } from "@/features/visualizer";
import { CodeEditor, ArgumentForm, executeCustomCode, analyzeCode } from "@/features/custom-code";
import { PanelHeader, Badge, ResizeHandle } from "@/shared/ui";
import * as styles from "./custom-page.css";

const DEFAULT_CODE = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// TypeScript & 중첩 함수도 지원됩니다!
// 예: function exist(board: string[][], word: string): boolean {
//       function backtrack(r: number, c: number, depth: number) { ... }
//     }`;

type Mode = "edit" | "loading" | "visualize" | "error";

export function CustomVisualizerClient() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [mode, setMode] = useState<Mode>("edit");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StepGeneratorResult | null>(null);
  const [finalReturnValue, setFinalReturnValue] = useState<unknown>(undefined);
  const [paramNames, setParamNames] = useState<string[]>(["n"]);
  const [leftWidth, setLeftWidth] = useState(380);
  const argsRef = useRef<unknown[]>([]);

  const player = useAlgorithmPlayer(result?.steps ?? []);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    try {
      const { analysis } = analyzeCode(newCode);
      setParamNames(analysis.userFacingParamNames);
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
        <span className={styles.title}>내 코드 시각화</span>
        <Badge variant="custom">커스텀</Badge>
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
              <PanelHeader title="JavaScript / TypeScript 재귀 함수를 입력하세요" />
              <div style={{ flex: 1, minHeight: 0 }}>
                <CodeEditor value={code} onChange={handleCodeChange} />
              </div>
            </div>
          </div>
          <div className={styles.argsPanel}>
            {error && <div className={styles.errorBox}>{error}</div>}
            <ArgumentForm paramNames={paramNames} onSubmit={handleExecute} />
          </div>
        </div>
      )}

      {/* Loading */}
      {mode === "loading" && <div className={styles.loadingOverlay}>실행 중...</div>}

      {/* Visualize mode */}
      {mode === "visualize" && result && (
        <div className={styles.vizContainer}>
          <div className={styles.vizRow}>
            {/* Left */}
            <div className={styles.leftPanel} style={{ width: `${leftWidth}px`, minWidth: "280px", maxWidth: "600px" }}>
              <div className={styles.codeSection}>
                <div className={styles.editorFullHeight}>
                  <PanelHeader title="코드 (읽기 전용)" action={{ label: "편집", onClick: handleEdit }} />
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <CodeEditor value={code} onChange={() => {}} readOnly />
                  </div>
                </div>
              </div>
              <CallStack currentStep={player.currentStep} tree={result.tree} />
              <div className={styles.variableSection}>
                <VariablePanel
                  currentStep={player.currentStep}
                  prevStep={player.currentIndex > 0 ? result.steps[player.currentIndex - 1] : undefined}
                />
              </div>
            </div>

            <ResizeHandle direction="horizontal" onResize={handleResize} />

            {/* Right */}
            <div className={styles.rightPanel} style={{ flex: 1 }}>
              <div className={styles.treeSection}>
                <TreeView tree={result.tree} currentStep={player.currentStep} />
              </div>
              <ResultPanel
                steps={result.steps}
                currentIndex={player.currentIndex}
                finalReturnValue={finalReturnValue}
              />
            </div>
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
