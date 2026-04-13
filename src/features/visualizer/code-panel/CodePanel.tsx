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

      // 이전 라인 해제
      if (prevLineRef.current !== undefined) {
        const prevEl = codeRef.current.querySelector(`[data-line="${prevLineRef.current}"]`);
        prevEl?.classList.remove("highlighted-line");
      }

      // 새 라인 하이라이트
      if (activeLine !== undefined) {
        const currEl = codeRef.current.querySelector(`[data-line="${activeLine}"]`);
        currEl?.classList.add("highlighted-line");
        currEl?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }

      prevLineRef.current = activeLine;
    },
    [activeLine]
  );

  return (
    <div className={styles.container}>
      {title && <div className={styles.header}>{title}</div>}
      <div ref={codeRef} className={styles.codeWrapper} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
