"use client";

import { useMemo } from "react";
import type { Step } from "@/entities/algorithm";
import * as styles from "./result-panel.css";

interface ConsoleLogEntry {
  text: string;
  stepIdx: number;
}

interface ResultPanelProps {
  steps: Step[];
  currentIndex: number;
  finalReturnValue?: unknown;
  consoleLogs?: ConsoleLogEntry[];
}

export function ResultPanel({ steps, currentIndex, finalReturnValue, consoleLogs }: ResultPanelProps) {
  // 프리셋: "결과에 [...] 추가" 패턴
  const allPresetResults = useMemo(() => {
    const results: { value: string; stepIdx: number }[] = [];
    for (const step of steps) {
      if (
        typeof step.variables.result === "string" &&
        step.description.includes("결과") &&
        step.description.includes("추가")
      ) {
        results.push({ value: step.variables.result, stepIdx: step.id });
      }
    }
    return results;
  }, [steps]);

  const visiblePresetResults = useMemo(
    () => allPresetResults.filter((r) => r.stepIdx <= currentIndex),
    [allPresetResults, currentIndex]
  );

  const hasPresetResults = visiblePresetResults.length > 0;
  const visibleLogs = useMemo(
    () => (consoleLogs ?? []).filter((log) => log.stepIdx <= currentIndex),
    [consoleLogs, currentIndex]
  );
  const hasLogs = visibleLogs.length > 0;
  const isComplete = currentIndex >= steps.length - 1;
  const hasReturn = isComplete && finalReturnValue !== undefined && finalReturnValue !== null;

  if (!hasPresetResults && !hasLogs && !hasReturn) {
    return null;
  }

  const latestIdx = hasPresetResults ? visiblePresetResults[visiblePresetResults.length - 1].stepIdx : -1;

  return (
    <div className={styles.container}>
      {/* 프리셋 결과 누적 */}
      {hasPresetResults && (
        <>
          <div className={styles.title}>
            결과 <span className={styles.countBadge}>{visiblePresetResults.length}개</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", marginBottom: "8px" }}>
            {visiblePresetResults.map((r, i) => (
              <span key={i} className={r.stepIdx === latestIdx ? styles.resultItemNew : styles.resultItem}>
                {r.value}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Console 출력 */}
      {hasLogs && (
        <>
          <div className={styles.title} style={{ color: "#94a3b8" }}>Console</div>
          <div className={styles.consoleBox}>
            {visibleLogs.map((log, i) => (
              <div key={i} className={styles.consoleLine}>
                {log.text}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Return 값 */}
      {hasReturn && (
        <>
          <div className={styles.title} style={{ color: "#4ade80" }}>Return</div>
          <div className={styles.finalResult}>
            {typeof finalReturnValue === "object" ? JSON.stringify(finalReturnValue, null, 2) : String(finalReturnValue)}
          </div>
        </>
      )}
    </div>
  );
}
