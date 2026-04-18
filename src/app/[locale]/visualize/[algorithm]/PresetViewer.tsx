"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import type { StepGeneratorResult, PresetAlgorithm } from "@/algorithm";
import { useAlgorithmPlayer } from "@/player";
import {
  TreeView,
  StepperControls,
  VariablePanel,
  ResultPanel,
  CodePanel,
} from "@/visualizer";
import { ArgumentForm } from "@/editor";
import type { ArgumentFormHandle } from "@/editor";
import * as styles from "./visualize-page.css";

interface PresetViewerProps {
  result: StepGeneratorResult;
  codeHtml: string;
  hasRecursion: boolean;
  preset: PresetAlgorithm;
  paramNames: string[];
  onRunCode: (args: unknown[]) => void;
  error?: string | null;
}

export function PresetViewer({
  result,
  codeHtml,
  hasRecursion,
  preset,
  paramNames,
  onRunCode,
  error,
}: PresetViewerProps) {
  const t = useTranslations();
  const player = useAlgorithmPlayer(result.steps);
  const argFormRef = useRef<ArgumentFormHandle>(null);

  const prevStep =
    player.currentIndex > 0 ? result.steps[player.currentIndex - 1] : undefined;

  return (
    <div className={styles.mainContent}>
      <div className={styles.vizRow}>
        <div className={styles.leftPanel}>
          <div className={styles.argsBar}>
            {error && <span className={styles.errorText}>{error}</span>}
            <div style={{ flex: 1 }} />
            <ArgumentForm ref={argFormRef} paramNames={paramNames} defaultArgs={preset.defaultArgs} onSubmit={onRunCode} />
            <button
              onClick={() => {
                const args = argFormRef.current?.getArgs() ?? preset.defaultArgs;
                onRunCode(args);
              }}
              className={styles.applyButton}
            >
              {t("visualizer.apply")}
            </button>
          </div>
          <div className={styles.codeSection}>
            <CodePanel
              html={codeHtml}
              activeLine={player.currentStep?.codeLine}
              callerLine={player.currentStep?.callerLine}
            />
          </div>
        </div>

        <div className={styles.middlePanel}>
          <div className={styles.variableSection}>
            <VariablePanel currentStep={player.currentStep} prevStep={prevStep} />
          </div>
          <ResultPanel steps={result.steps} currentIndex={player.currentIndex} />
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
  );
}
