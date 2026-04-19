import { itemAt } from "@/shared/lib/array";
import { didChange } from "./diff";
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

function spanClassFor(changed: boolean): string {
  return changed ? styles.varValueHighlighted : styles.varValue;
}

interface GridCellProps {
  cellValue: unknown;
  prevCell: unknown;
}

function GridCell({ cellValue, prevCell }: GridCellProps) {
  const changed = didChange(prevCell, cellValue);
  return (
    <span className={changed ? styles.cellChanged : styles.cell}>
      {String(cellValue)}
    </span>
  );
}

interface Grid1DProps {
  value: unknown[];
  prevValue: unknown;
}

function Grid1D({ value, prevValue }: Grid1DProps) {
  return (
    <div className={styles.grid}>
      {value.map((cellValue, cellIndex) => (
        <GridCell
          key={cellIndex}
          cellValue={cellValue}
          prevCell={itemAt(prevValue, cellIndex)}
        />
      ))}
    </div>
  );
}

interface Grid2DRowProps {
  row: unknown;
  rowIndex: number;
  prevValue: unknown;
}

function Grid2DRow({ row, rowIndex, prevValue }: Grid2DRowProps) {
  return (
    <div className={styles.gridRow}>
      {Array.isArray(row)
        ? row.map((cellValue, colIndex) => (
          <GridCell
            key={colIndex}
            cellValue={cellValue}
            prevCell={itemAt(itemAt(prevValue, rowIndex), colIndex)}
          />
        ))
        : <span className={styles.cell}>{String(row)}</span>}
    </div>
  );
}

interface Grid2DProps {
  value: unknown[][];
  prevValue: unknown;
}

function Grid2D({ value, prevValue }: Grid2DProps) {
  return (
    <div className={styles.grid2d}>
      {value.map((row, rowIndex) => (
        <Grid2DRow key={rowIndex} row={row} rowIndex={rowIndex} prevValue={prevValue} />
      ))}
    </div>
  );
}

interface FunctionCardProps {
  value: FunctionMarker;
  changed: boolean;
}

function FunctionCard({ value, changed }: FunctionCardProps) {
  const cardClass = changed ? styles.functionCardHighlighted : styles.functionCard;
  const closureEntries = Object.entries(value.closure);
  const signature = `(${value.params.join(", ")})`;
  return (
    <div className={cardClass}>
      <div className={styles.functionCardHeader}>
        <span className={styles.functionLabel}>fn</span>
        <span className={styles.functionName}>{value.funcName}</span>
        <span className={styles.functionSignature}>{signature}</span>
      </div>
      {closureEntries.length > 0 && (
        <div className={styles.functionCardBody}>
          {closureEntries.map(([varName, varValue]) => (
            <div key={varName} className={styles.functionRow}>
              <span className={styles.functionVarName}>{varName}</span>
              <Value value={varValue} changed={false} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ArrayValueProps {
  value: unknown[];
  prevValue: unknown;
  changed: boolean;
}

function ArrayValue({ value, prevValue, changed }: ArrayValueProps) {
  if (value.length === 0) {
    return <span className={spanClassFor(changed)}>[ ]</span>;
  }
  if (Array.isArray(value[0])) {
    return <Grid2D value={value as unknown[][]} prevValue={prevValue} />;
  }
  return <Grid1D value={value} prevValue={prevValue} />;
}

interface BooleanValueProps {
  value: boolean;
  changed: boolean;
}

function BooleanValue({ value, changed }: BooleanValueProps) {
  const color = value ? "#22c55e" : "#ef4444";
  return (
    <span className={spanClassFor(changed)} style={{ color }}>
      {String(value)}
    </span>
  );
}

interface ObjectValueProps {
  value: object;
  changed: boolean;
}

function ObjectValue({ value, changed }: ObjectValueProps) {
  return <span className={spanClassFor(changed)}>{JSON.stringify(value)}</span>;
}

interface PrimitiveValueProps {
  value: unknown;
  changed: boolean;
}

function PrimitiveValue({ value, changed }: PrimitiveValueProps) {
  return <span className={spanClassFor(changed)}>{String(value)}</span>;
}

interface ValueProps {
  value: unknown;
  changed: boolean;
  prevValue?: unknown;
}

export function Value({ value, changed, prevValue }: ValueProps) {
  if (isFunctionMarker(value)) return <FunctionCard value={value} changed={changed} />;
  if (Array.isArray(value)) return <ArrayValue value={value} prevValue={prevValue} changed={changed} />;
  if (typeof value === "boolean") return <BooleanValue value={value} changed={changed} />;
  if (typeof value === "object" && value !== null) return <ObjectValue value={value} changed={changed} />;
  return <PrimitiveValue value={value} changed={changed} />;
}
