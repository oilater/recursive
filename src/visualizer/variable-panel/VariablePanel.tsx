"use client";

import type { Step } from "@/algorithm";
import { useTranslations } from "next-intl";
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
          {(value as unknown[][]).map((row, i) => (
            <span key={i} className={styles.arrayItem} style={{ width: "auto" }}>
              [{Array.isArray(row) ? row.join(", ") : String(row)}]
            </span>
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
      <span
        className={styles.varValue}
        style={{ color: value ? "#22c55e" : "#ef4444", ...changeStyle }}
      >
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
  const t = useTranslations("visualizer");
  if (!currentStep) {
    return (
      <div className={styles.container}>
        <div className={styles.title}>Variables</div>
        <EmptyState message={t("variablesEmpty")} />
      </div>
    );
  }

  const visibleVars = omit(currentStep.variables, HIDDEN_KEYS);
  const prevVars = prevStep ? omit(prevStep.variables, HIDDEN_KEYS) : {};
  const entries = Object.entries(visibleVars);

  return (
    <div className={styles.container}>
      <div className={styles.title}>Variables</div>
      {entries.map(([key, value]) => {
        const changed = prevStep !== undefined && didChange(prevVars[key], value);
        return (
          <div key={key} className={changed ? styles.rowChanged : styles.row}>
            <span className={styles.varName}>
              {key}
              {changed && (
                <span style={{ color: "#fbbf24", marginLeft: "4px", fontSize: "9px" }}>
                  changed
                </span>
              )}
            </span>
            {renderValue(value, changed)}
          </div>
        );
      })}
    </div>
  );
}
