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

function cellChanged(prevArr: unknown, currArr: unknown[], index: number): boolean {
  if (!Array.isArray(prevArr)) return true;
  if (index >= prevArr.length) return true;
  return JSON.stringify(prevArr[index]) !== JSON.stringify(currArr[index]);
}

function cell2dChanged(prevArr: unknown, row: number, col: number, value: unknown): boolean {
  if (!Array.isArray(prevArr)) return true;
  if (row >= prevArr.length) return true;
  const prevRow = prevArr[row];
  if (!Array.isArray(prevRow)) return true;
  if (col >= prevRow.length) return true;
  return JSON.stringify(prevRow[col]) !== JSON.stringify(value);
}

function renderGrid1D(value: unknown[], prevValue: unknown): React.ReactNode {
  return (
    <div className={styles.grid}>
      {value.map((item, i) => (
        <span
          key={i}
          className={cellChanged(prevValue, value, i) ? styles.cellChanged : styles.cell}
        >
          {String(item)}
        </span>
      ))}
    </div>
  );
}

function renderGrid2D(value: unknown[][], prevValue: unknown): React.ReactNode {
  return (
    <div className={styles.grid2d}>
      {value.map((row, r) => (
        <div key={r} className={styles.gridRow}>
          {Array.isArray(row) ? row.map((item, c) => (
            <span
              key={c}
              className={cell2dChanged(prevValue, r, c, item) ? styles.cellChanged : styles.cell}
            >
              {String(item)}
            </span>
          )) : (
            <span className={styles.cell}>{String(row)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function renderValue(value: unknown, changed: boolean, prevValue?: unknown): React.ReactNode {
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
      return renderGrid2D(value as unknown[][], prevValue);
    }

    return renderGrid1D(value, prevValue);
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

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return (
      <span className={styles.varValue} style={changeStyle}>
        {JSON.stringify(value)}
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
            <span className={styles.varName}>{key}</span>
            {renderValue(value, changed, prevVars[key])}
          </div>
        );
      })}
    </div>
  );
}
