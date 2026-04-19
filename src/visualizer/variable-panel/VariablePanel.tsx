"use client";

import type { Step } from "@/algorithm";
import { findPrevFrame, isVisibleFrame } from "@/algorithm/frames";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/shared/ui";
import { useScrollActiveIntoView } from "@/shared/hooks/useScrollActiveIntoView";
import { FrameCard } from "./FrameCard";
import * as styles from "./variable-panel.css";

interface VariablePanelProps {
  currentStep: Step | undefined;
  prevStep?: Step | undefined;
}

function getActiveFrameKey(step: Step | undefined): string | null {
  if (!step || step.frames.length === 0) return null;
  const lastIndex = step.frames.length - 1;
  return `${lastIndex}:${step.frames[lastIndex].funcName}`;
}

function EmptyPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className={styles.container}>
      <div className={styles.title}>{title}</div>
      <EmptyState message={message} />
    </div>
  );
}

export function VariablePanel({ currentStep, prevStep }: VariablePanelProps) {
  const t = useTranslations("visualizer");
  const activeFrameKey = getActiveFrameKey(currentStep);
  const activeFrameRef = useScrollActiveIntoView<HTMLDivElement>(activeFrameKey);

  if (!currentStep || currentStep.frames.length === 0) {
    return <EmptyPanel title="Variables" message={t("variablesEmpty")} />;
  }

  const lastIdx = currentStep.frames.length - 1;
  const orderedFrames = currentStep.frames
    .map((frame, depth) => ({ frame, depth }))
    .filter(({ frame }) => isVisibleFrame(frame));

  if (orderedFrames.length === 0) {
    return <EmptyPanel title="Call Stack" message={t("variablesEmpty")} />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <span className={styles.titleInRow}>Call Stack</span>
        <span className={styles.depthBadge}>
          {orderedFrames.length} {orderedFrames.length === 1 ? "frame" : "frames"}
        </span>
      </div>

      <div className={styles.stack}>
        {orderedFrames.map(({ frame, depth }, renderIdx) => {
          const isActive = depth === lastIdx;
          const isRoot = renderIdx === 0 && !isActive;
          const isLast = renderIdx === orderedFrames.length - 1;

          return (
            <div key={`${depth}:${frame.funcName}`} className={styles.frameWrapper}>
              <FrameCard
                ref={isActive ? activeFrameRef : undefined}
                frame={frame}
                depth={depth}
                isActive={isActive}
                isRoot={isRoot}
                prevFrame={findPrevFrame(prevStep, depth, frame.funcName)}
              />
              {!isLast && <div className={styles.stackConnector} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
