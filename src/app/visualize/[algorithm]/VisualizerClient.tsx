"use client";

import { useState, useMemo } from "react";
import type { StepGeneratorResult } from "@/entities/algorithm";
import { getMeta, getStepGenerator } from "@/entities/algorithm";
import { initializeAlgorithms } from "@/features/preset-algorithms";
import { useAlgorithmPlayer } from "@/features/player";
import {
  TreeView,
  CodePanel,
  StepperControls,
  VariablePanel,
  InputForm,
  CallStack,
  ResultPanel,
} from "@/features/visualizer";
import { Badge } from "@/shared/ui";
import * as styles from "./visualize-page.css";

initializeAlgorithms();

interface VisualizerClientProps {
  algorithmId: string;
  codeHtml: string;
}

export function VisualizerClient({ algorithmId, codeHtml }: VisualizerClientProps) {
  const meta = getMeta(algorithmId)!;
  const stepGenerator = getStepGenerator(algorithmId)!;

  const [input, setInput] = useState<Record<string, unknown>>(meta.inputConfig.defaults);
  const [leftWidth, setLeftWidth] = useState(0);

  const result: StepGeneratorResult = useMemo(() => stepGenerator(input), [stepGenerator, input]);
  const player = useAlgorithmPlayer(result.steps);

  const handleResize = (delta: number) => setLeftWidth((w) => Math.max(280, Math.min(800, w + delta)));

  const prevStep = player.currentIndex > 0 ? result.steps[player.currentIndex - 1] : undefined;
  const difficultyLabel = { easy: "쉬움", medium: "보통", hard: "어려움" }[meta.difficulty];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <a href="/" className={styles.backLink}>
          ← 목록
        </a>
        <span className={styles.algoTitle}>{meta.name}</span>
        <Badge variant={meta.difficulty}>{difficultyLabel}</Badge>
      </div>

      <div className={styles.mainContent} style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", flex: 1, overflow: "hidden", gap: "16px" }}>
          {/* Col 1: 코드 (flex 3) */}
          <div className={styles.leftPanel} style={{ flex: 3, minWidth: 0 }}>
            <div className={styles.codeSection}>
              <CodePanel html={codeHtml} activeLine={player.currentStep?.codeLine} />
            </div>
          </div>

          {/* Col 2: 상태 (flex 2) */}
          <div className={styles.middlePanel}>
            <CallStack currentStep={player.currentStep} tree={result.tree} />
            <div className={styles.variableSection}>
              <VariablePanel currentStep={player.currentStep} prevStep={prevStep} />
            </div>
            <ResultPanel steps={result.steps} currentIndex={player.currentIndex} />
          </div>

          {/* Col 3: 트리 (flex 2) */}
          <div className={styles.rightPanel} style={{ flex: 2, minWidth: 0 }}>
            <div className={styles.treeSection}>
              <TreeView tree={result.tree} currentStep={player.currentStep} />
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className={styles.bottomPanel}>
          <InputForm config={meta.inputConfig} onSubmit={setInput} />
          <StepperControls player={player} />
        </div>
      </div>
    </div>
  );
}
