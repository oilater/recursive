import { cellChanged, cell2dChanged } from "./diff";
import * as styles from "./variable-panel.css";

export interface FunctionMarker {
  __kind: "function";
  funcName: string;
  params: string[];
  closure: Record<string, unknown>;
}

export function isFunctionMarker(v: unknown): v is FunctionMarker {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    (v as { __kind?: unknown }).__kind === "function"
  );
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

export function renderValue(
  value: unknown,
  changed: boolean,
  prevValue?: unknown,
): React.ReactNode {
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
