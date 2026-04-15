"use client";

import type { StepGeneratorResult } from "@/algorithm";
import { useAlgorithmPlayer } from "@/player";
import {
  StepperControls,
  VariablePanel,
  ResultPanel,
  CodePanel,
} from "@/visualizer";
import * as styles from "./embed.css";

interface EmbedViewerProps {
  result: StepGeneratorResult;
  codeHtml: string;
  hasRecursion: boolean;
  finalReturnValue: unknown;
  consoleLogs: Array<{ text: string; stepIdx: number }>;
}

export function EmbedViewer({
  result,
  codeHtml,
  hasRecursion,
  finalReturnValue,
  consoleLogs,
}: EmbedViewerProps) {
  const player = useAlgorithmPlayer(result.steps);

  const prevStep =
    player.currentIndex > 0 ? result.steps[player.currentIndex - 1] : undefined;

  return (
    <div className={styles.vizContainer}>
      <div className={styles.vizRow}>
        <div className={styles.leftPanel}>
          <div className={styles.codeSection}>
            <CodePanel html={codeHtml} activeLine={player.currentStep?.codeLine} />
          </div>
        </div>

        <div className={styles.middlePanel}>
          <div className={styles.variableSection}>
            <VariablePanel currentStep={player.currentStep} prevStep={prevStep} />
          </div>
          <ResultPanel
            steps={result.steps}
            currentIndex={player.currentIndex}
            finalReturnValue={finalReturnValue}
            consoleLogs={consoleLogs}
          />
        </div>

      </div>

      <div className={styles.bottomPanel}>
        <StepperControls player={player} />
      </div>
    </div>
  );
}
