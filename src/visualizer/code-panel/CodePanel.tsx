"use client";

import { useEffect, useRef } from "react";
import * as styles from "./code-panel.css";

interface CodePanelProps {
  html: string;
  activeLine: number | undefined;
  title?: string;
}

export function CodePanel({ html, activeLine, title }: CodePanelProps) {
  const codeRef = useRef<HTMLDivElement>(null);
  const prevLineRef = useRef<number | undefined>(undefined);

  useEffect(
    function highlightActiveLine() {
      if (!codeRef.current) return;

      codeRef.current.querySelectorAll(".highlighted-line").forEach((el) => {
        el.classList.remove("highlighted-line");
      });

      if (activeLine !== undefined) {
        const currEl = codeRef.current.querySelector(`[data-line="${activeLine}"]`);
        currEl?.classList.add("highlighted-line");
        currEl?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }

      prevLineRef.current = activeLine;
    },
    [activeLine, html],
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
}
