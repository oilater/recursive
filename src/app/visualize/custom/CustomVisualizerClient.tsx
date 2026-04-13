"use client";

import { useState, useRef } from "react";
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
import { PanelHeader } from "@/shared/ui";
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
  const [leftWidth, setLeftWidth] = useState(0);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setMode("error");
    }
  };

  const handleResize = (delta: number) =>
    setLeftWidth((w) => Math.max(280, Math.min(800, w + delta)));

  const handleEdit = () => {
    setMode("edit");
    setResult(null);
    setError(null);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <a href="/" className={styles.backLink}>
          ← Recursive
        </a>
        {mode === "visualize" && (
          <button className={styles.backLink} onClick={handleEdit} style={{ marginLeft: "auto" }}>
            ← 편집
          </button>
        )}
      </div>

      {/* Edit mode */}
      {(mode === "edit" || mode === "error") && (
        <div className={styles.editLayout}>
          {error && <div className={styles.errorBox}>{error}</div>}
          <div className={styles.hintBanner}>
            💡 JS / TS 코드를 붙여넣으면 함수와 매개변수를 자동으로 인식해요. 값을 입력하고
            실행해보세요!
          </div>
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
              ▶ 실행
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {mode === "loading" && <div className={styles.loadingOverlay}>실행 중...</div>}

      {/* Visualize mode */}
      {mode === "visualize" && result && (
        <div className={styles.vizContainer}>
          <div className={styles.vizRow}>
            {/* Col 1: 코드 (flex 3) */}
            <div className={styles.leftPanel} style={{ flex: 3, minWidth: 0 }}>
              <div className={styles.codeSection}>
                <CodePanel html={codeHtml} activeLine={player.currentStep?.codeLine} />
              </div>
            </div>

            {/* Col 2: 상태 (flex 2) */}
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

            {/* Col 3: 트리 (flex 2, 재귀가 있을 때만) */}
            {hasRecursion && (
              <div className={styles.rightPanel} style={{ flex: 2, minWidth: 0 }}>
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
