"use client";

import { useMemo } from "react";
import type { Step } from "@/entities/algorithm";
import { EmptyState } from "@/shared/ui";
import * as styles from "./result-panel.css";

interface ResultPanelProps {
  steps: Step[];
  currentIndex: number;
  finalReturnValue?: unknown;
}

/**
 * 현재 스텝까지의 결과를 누적 표시합니다.
 *
 * - "result" 변수가 있는 step에서 결과를 추출
 * - 각 return step의 returnValue를 수집
 * - 최종 리턴값이 있으면 별도 표시
 */
export function ResultPanel({ steps, currentIndex, finalReturnValue }: ResultPanelProps) {
  // steps 변경 시 한 번만 전체 스캔 (O(n)), 이후는 slice만 (O(1))
  const allCollectedResults = useMemo(() => {
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

  const allReturnValues = useMemo(() => {
    const returns: { value: string; stepIdx: number }[] = [];
    for (const step of steps) {
      if (step.type === "return" && step.variables.returnValue !== undefined) {
        const val = step.variables.returnValue;
        const formatted = typeof val === "object" ? JSON.stringify(val) : String(val);
        if (formatted !== "undefined") {
          returns.push({ value: formatted, stepIdx: step.id });
        }
      }
    }
    return returns;
  }, [steps]);

  const collectedResults = useMemo(
    () => allCollectedResults.filter((r) => r.stepIdx <= currentIndex),
    [allCollectedResults, currentIndex]
  );
  const returnValues = useMemo(
    () => allReturnValues.filter((r) => r.stepIdx <= currentIndex),
    [allReturnValues, currentIndex]
  );

  const latestResultIdx = collectedResults.length > 0 ? collectedResults[collectedResults.length - 1].stepIdx : -1;
  const hasCollected = collectedResults.length > 0;
  const hasReturns = returnValues.length > 0;
  const isComplete = currentIndex >= steps.length - 1;

  if (!hasCollected && !hasReturns && !finalReturnValue) {
    return (
      <div className={styles.container}>
        <div className={styles.title}>결과</div>
        <EmptyState message="실행이 진행되면 결과가 표시됩니다" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        결과
        {hasCollected && <span className={styles.countBadge}>{collectedResults.length}개 수집됨</span>}
      </div>

      {/* Collected results (result.push pattern) */}
      {hasCollected && (
        <div style={{ display: "flex", flexWrap: "wrap", marginBottom: "8px" }}>
          {collectedResults.map((r, i) => (
            <span key={i} className={r.stepIdx === latestResultIdx ? styles.resultItemNew : styles.resultItem}>
              {r.value}
            </span>
          ))}
        </div>
      )}

      {/* Return values (non-void) */}
      {!hasCollected && hasReturns && (
        <div style={{ display: "flex", flexWrap: "wrap", marginBottom: "8px" }}>
          {returnValues.slice(-10).map((r, i) => (
            <span
              key={i}
              className={
                r.stepIdx === returnValues[returnValues.length - 1]?.stepIdx ? styles.resultItemNew : styles.resultItem
              }
            >
              {r.value}
            </span>
          ))}
          {returnValues.length > 10 && (
            <span className={styles.resultItem} style={{ opacity: 0.5 }}>
              +{returnValues.length - 10}개 더
            </span>
          )}
        </div>
      )}

      {/* Final return value */}
      {isComplete && finalReturnValue !== undefined && (
        <div>
          <div className={styles.finalLabel}>최종 반환값</div>
          <div className={styles.finalResult}>
            {typeof finalReturnValue === "object"
              ? JSON.stringify(finalReturnValue, null, 2)
              : String(finalReturnValue)}
          </div>
        </div>
      )}
    </div>
  );
}
