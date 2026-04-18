"use client";

import type { Step, Frame } from "@/algorithm";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/shared/ui";
import { useScrollActiveIntoView } from "@/shared/hooks/useScrollActiveIntoView";
import * as styles from "./variable-panel.css";

interface VariablePanelProps {
  currentStep: Step | undefined;
  prevStep?: Step | undefined;
}

const ENTRY_FRAME_NAME = "__entry__";
const ENTRY_LABEL = "global";

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

interface FunctionMarker {
  __kind: "function";
  funcName: string;
  params: string[];
  closure: Record<string, unknown>;
}

function isFunctionMarker(v: unknown): v is FunctionMarker {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    (v as { __kind?: unknown }).__kind === "function"
  );
}

function renderFunctionCard(value: FunctionMarker, changed: boolean): React.ReactNode {
  const wrapperStyle = changed
    ? { outline: "1.5px solid #fbbf24", outlineOffset: "1px", borderRadius: "6px" }
    : undefined;
  const closureEntries = Object.entries(value.closure);
  const sig = `(${value.params.join(", ")})`;
  return (
    <div className={styles.functionCard} style={wrapperStyle}>
      <div className={styles.functionCardHeader}>
        <span className={styles.functionLabel}>fn</span>
        <span className={styles.functionName}>{value.funcName}</span>
        <span className={styles.functionSignature}>{sig}</span>
      </div>
      {closureEntries.length > 0 && (
        <div className={styles.functionCardBody}>
          {closureEntries.map(([k, v]) => (
            <div key={k} className={styles.functionRow}>
              <span className={styles.functionVarName}>{k}</span>
              {renderValue(v, false)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function renderValue(value: unknown, changed: boolean, prevValue?: unknown): React.ReactNode {
  const changeStyle = changed
    ? { outline: "1.5px solid #fbbf24", outlineOffset: "1px", borderRadius: "4px" }
    : undefined;

  if (isFunctionMarker(value)) {
    return renderFunctionCard(value, changed);
  }

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

function findPrevFrame(prevStep: Step | undefined, depth: number, funcName: string): Frame | undefined {
  if (!prevStep) return undefined;
  const candidate = prevStep.frames[depth];
  if (candidate && candidate.funcName === funcName) return candidate;
  return undefined;
}

function frameLabel(frame: Frame): string {
  return frame.funcName === ENTRY_FRAME_NAME ? ENTRY_LABEL : frame.funcName;
}

export function VariablePanel({ currentStep, prevStep }: VariablePanelProps) {
  const t = useTranslations("visualizer");
  const activeFrameKey = currentStep?.frames.length
    ? `${currentStep.frames.length - 1}:${currentStep.frames[currentStep.frames.length - 1].funcName}`
    : null;
  const activeFrameRef = useScrollActiveIntoView<HTMLDivElement>(activeFrameKey);

  if (!currentStep || currentStep.frames.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.title}>Variables</div>
        <EmptyState message={t("variablesEmpty")} />
      </div>
    );
  }

  const lastIdx = currentStep.frames.length - 1;
  const orderedFrames = currentStep.frames
    .map((frame, depth) => ({ frame, depth }))
    .filter(
      ({ frame }) =>
        frame.funcName !== ENTRY_FRAME_NAME || Object.keys(frame.variables).length > 0,
    );

  if (orderedFrames.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.title}>Call Stack</div>
        <EmptyState message={t("variablesEmpty")} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <span className={styles.title}>Call Stack</span>
        <span className={styles.depthBadge}>
          {orderedFrames.length} {orderedFrames.length === 1 ? "frame" : "frames"}
        </span>
      </div>

      <div className={styles.stack}>
        {orderedFrames.map(({ frame, depth }, renderIdx) => {
          const isActive = depth === lastIdx;
          const isRoot = renderIdx === 0 && !isActive;
          const isLast = renderIdx === orderedFrames.length - 1;
          const prevFrame = findPrevFrame(prevStep, depth, frame.funcName);
          const entries = Object.entries(frame.variables);

          const cardClass = isActive
            ? styles.frameCardActive
            : isRoot
              ? styles.frameCardRoot
              : styles.frameCard;

          return (
            <div key={`${depth}:${frame.funcName}`} className={styles.frameWrapper}>
              <div className={cardClass} ref={isActive ? activeFrameRef : undefined}>
                <div className={styles.frameHeader}>
                  <span className={styles.frameDepth}>#{depth}</span>
                  <span className={styles.frameName}>{frameLabel(frame)}</span>
                  {isActive && <span className={styles.activeBadge}>active</span>}
                </div>
                {entries.length === 0 ? (
                  <div className={styles.frameEmpty}>(no locals)</div>
                ) : (
                  <div className={styles.frameBody}>
                    {entries.map(([key, value]) => {
                      const changed =
                        prevFrame !== undefined && didChange(prevFrame.variables[key], value);
                      return (
                        <div key={key} className={changed ? styles.rowChanged : styles.row}>
                          <span className={styles.varName}>{key}</span>
                          {renderValue(value, changed, prevFrame?.variables[key])}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {!isLast && <div className={styles.stackConnector} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
