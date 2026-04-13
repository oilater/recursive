"use client";

import { useCallback } from "react";
import type { AlgorithmPlayer, Speed } from "@/player";
import { Badge } from "@/shared/ui";
import * as styles from "./stepper.css";

const SPEEDS: Speed[] = [0.5, 1, 2, 4];

interface StepperControlsProps {
  player: AlgorithmPlayer;
}

export function StepperControls({ player }: StepperControlsProps) {
  const {
    currentIndex,
    currentStep,
    totalSteps,
    isPlaying,
    speed,
    isAtStart,
    isAtEnd,
    stepForward,
    stepBackward,
    jumpToStart,
    jumpToEnd,
    togglePlay,
    setSpeed,
  } = player;

  const progress = totalSteps > 0 ? (currentIndex / (totalSteps - 1)) * 100 : 0;

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const index = Math.round(ratio * (totalSteps - 1));
      player.jumpTo(index);
    },
    [totalSteps, player]
  );

  return (
    <div className={styles.container}>
      {/* Step description with CALL/RETURN badge */}
      <div className={styles.description}>
        {currentStep ? (
          <>
            <Badge variant={currentStep.type === "call" ? "call" : "return"}>
              {currentStep.type === "call" ? "CALL" : "RETURN"}
            </Badge>
            <span style={{ marginLeft: "8px" }}>{currentStep.description}</span>
          </>
        ) : (
          "시작하려면 재생 버튼을 누르세요"
        )}
      </div>

      {/* Progress bar */}
      <div className={styles.progressContainer}>
        <span className={styles.stepInfo}>
          {currentIndex + 1} / {totalSteps}
        </span>
        <div className={styles.progressBar} onClick={handleProgressClick}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Transport controls */}
      <div className={styles.controls}>
        <button className={styles.controlButton} onClick={jumpToStart} data-disabled={isAtStart} title="처음으로">
          ⏮
        </button>
        <button className={styles.controlButton} onClick={stepBackward} data-disabled={isAtStart} title="한 단계 뒤로">
          ◀
        </button>
        <button className={styles.playButton} onClick={togglePlay} title={isPlaying ? "일시정지" : "재생"}>
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button className={styles.controlButton} onClick={stepForward} data-disabled={isAtEnd} title="한 단계 앞으로">
          ▶
        </button>
        <button className={styles.controlButton} onClick={jumpToEnd} data-disabled={isAtEnd} title="끝으로">
          ⏭
        </button>
      </div>

      {/* Speed controls */}
      <div className={styles.speedControls}>
        {SPEEDS.map((s) => (
          <button key={s} className={styles.speedButton} data-active={speed === s} onClick={() => setSpeed(s)}>
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
