"use client";

import { memo, useEffect, useRef } from "react";
import * as styles from "./code-panel.css";

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

      const lineEl = (line: number | undefined) =>
        line !== undefined ? root.querySelector(`[data-line="${line}"]`) : null;

      const stillApplied = (line: number | undefined, klass: string) => {
        if (line === undefined) return false;
        return !!root.querySelector(`[data-line="${line}"].${klass}`);
      };

      const prevActive = stillApplied(activeLineRef.current, "highlighted-line")
        ? activeLineRef.current
        : undefined;
      const prevCaller = stillApplied(callerLineRef.current, "highlighted-caller")
        ? callerLineRef.current
        : undefined;

      if (prevCaller !== callerLine) {
        if (prevCaller !== undefined) {
          const old = lineEl(prevCaller);
          old?.classList.remove("highlighted-caller");
          old?.querySelector(".caller-badge")?.remove();
        }
        if (callerLine !== undefined) {
          const next = lineEl(callerLine);
          if (next) {
            next.classList.add("highlighted-caller");
            const badge = document.createElement("span");
            badge.className = "caller-badge";
            badge.textContent = "caller";
            next.appendChild(badge);
          }
        }
        callerLineRef.current = callerLine;
      }

      if (prevActive !== activeLine) {
        if (prevActive !== undefined) lineEl(prevActive)?.classList.remove("highlighted-line");
        if (activeLine !== undefined) {
          const next = lineEl(activeLine);
          if (next) {
            next.classList.add("highlighted-line");
            next.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }
        }
        activeLineRef.current = activeLine;
      }
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
