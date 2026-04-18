"use client";

import { memo, useEffect, useRef } from "react";
import * as styles from "./code-panel.css";
import {
  hasActiveHighlight,
  hasCallerHighlight,
  syncActiveHighlight,
  syncCallerHighlight,
} from "./highlight";

interface CodePanelProps {
  html: string;
  activeLine: number | undefined;
  callerLine?: number | undefined;
  title?: string;
}

export const CodePanel = memo(function CodePanel({
  html,
  activeLine,
  callerLine,
  title,
}: CodePanelProps) {
  const codeRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<number | undefined>(undefined);
  const callerLineRef = useRef<number | undefined>(undefined);

  useEffect(
    function highlightActiveLine() {
      const root = codeRef.current;
      if (!root) return;

      const prevActive = hasActiveHighlight(root, activeLineRef.current)
        ? activeLineRef.current
        : undefined;
      const prevCaller = hasCallerHighlight(root, callerLineRef.current)
        ? callerLineRef.current
        : undefined;

      syncCallerHighlight(root, prevCaller, callerLine);
      callerLineRef.current = callerLine;

      syncActiveHighlight(root, prevActive, activeLine);
      activeLineRef.current = activeLine;
    },
    [activeLine, callerLine, html],
  );

  return (
    <div className={styles.container}>
      {title && <div className={styles.header}>{title}</div>}
      <div
        ref={codeRef}
        className={styles.codeWrapper}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
});
