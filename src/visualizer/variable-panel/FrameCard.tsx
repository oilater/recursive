import { forwardRef } from "react";
import type { Frame } from "@/algorithm";
import { isEntryFrame } from "@/algorithm/frames";
import { didChange } from "./diff";
import { Value } from "./render";
import * as styles from "./variable-panel.css";

const ENTRY_LABEL = "global";

function frameLabel(frame: Frame): string {
  return isEntryFrame(frame) ? ENTRY_LABEL : frame.funcName;
}

function getFrameCardClass(isActive: boolean, isRoot: boolean): string {
  if (isActive) return styles.frameCardActive;
  if (isRoot) return styles.frameCardRoot;
  return styles.frameCard;
}

interface FrameCardProps {
  frame: Frame;
  depth: number;
  isActive: boolean;
  isRoot: boolean;
  prevFrame: Frame | undefined;
}

export const FrameCard = forwardRef<HTMLDivElement, FrameCardProps>(function FrameCard(
  { frame, depth, isActive, isRoot, prevFrame },
  ref,
) {
  const entries = Object.entries(frame.variables);
  const cardClass = getFrameCardClass(isActive, isRoot);

  return (
    <div className={cardClass} ref={ref}>
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
                <Value value={value} changed={changed} prevValue={prevFrame?.variables[key]} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
