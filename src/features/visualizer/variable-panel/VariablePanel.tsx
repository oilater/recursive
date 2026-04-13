"use client";

import type { Step } from "@/entities/algorithm";
import { omit } from "es-toolkit";
import { EmptyState } from "@/shared/ui";
import * as styles from "./variable-panel.css";

interface VariablePanelProps {
  currentStep: Step | undefined;
  prevStep?: Step | undefined;
}

const HIDDEN_KEYS = ["depth"] as const;

function didChange(prev: unknown, curr: unknown): boolean {
  if (prev === curr) return false;
  if (typeof prev !== typeof curr) return true;
  if (typeof prev !== "object" || prev === null) return prev !== curr;
  return JSON.stringify(prev) !== JSON.stringify(curr);
}

function renderValue(value: unknown, changed: boolean): React.ReactNode {
  const changeStyle = changed
    ? { outline: "1.5px solid #fbbf24", outlineOffset: "1px", borderRadius: "4px" }
    : undefined;

  if (Array.isArray(value)) {
    if (value.length === 0)
      return (
        <span className={styles.varValue} style={changeStyle}>
          [ ]
        </span>
      );

    if (Array.isArray(value[0])) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", ...changeStyle }}>
          {(value as number[][]).map((row, i) => (
            <div key={i} className={styles.arrayContainer}>
              {row.map((cell, j) => (
                <span
                  key={j}
                  className={styles.arrayItem}
                  style={{
                    backgroundColor: cell === 1 ? "#fbbf24" : undefined,
                    color: cell === 1 ? "#1a1a24" : undefined,
                  }}
                >
                  {cell === 1 ? "♛" : "·"}
                </span>
              ))}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className={styles.arrayContainer} style={changeStyle}>
        {value.map((item, i) => (
          <span key={i} className={styles.arrayItem}>
            {String(item)}
          </span>
        ))}
      </div>
    );
  }

  if (typeof value === "boolean") {
    return (
      <span className={styles.varValue} style={{ color: value ? "#22c55e" : "#ef4444", ...changeStyle }}>
        {String(value)}
      </span>
    );
  }

  return (
    <span className={styles.varValue} style={changeStyle}>
      {String(value)}
    </span>
  );
}

export function VariablePanel({ currentStep, prevStep }: VariablePanelProps) {
  if (!currentStep) {
    return (
      <div className={styles.container}>
        <div className={styles.title}>변수 상태</div>
        <EmptyState message="스텝을 실행하면 변수 상태가 표시됩니다" />
      </div>
    );
  }

  const visibleVars = omit(currentStep.variables, HIDDEN_KEYS);
  const prevVars = prevStep ? omit(prevStep.variables, HIDDEN_KEYS) : {};
  const entries = Object.entries(visibleVars);

  return (
    <div className={styles.container}>
      <div className={styles.title}>변수 상태</div>
      {entries.map(([key, value]) => {
        const changed = prevStep !== undefined && didChange(prevVars[key], value);
        return (
          <div key={key} className={changed ? styles.rowChanged : styles.row}>
            <span className={styles.varName}>
              {key}
              {changed && <span style={{ color: "#fbbf24", marginLeft: "4px", fontSize: "9px" }}>changed</span>}
            </span>
            {renderValue(value, changed)}
          </div>
        );
      })}
    </div>
  );
}
