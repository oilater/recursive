"use client";

import { useState, useRef, useEffect } from "react";
import * as styles from "./embed-dropdown.css";

interface EmbedDropdownProps {
  embedUrl: string;
  iframeSnippet: string;
}

export function EmbedDropdown({ embedUrl, iframeSnippet }: EmbedDropdownProps) {
  const [open, setOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(
    function closeOnClickOutside() {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    },
    [open],
  );

  const handleCopy = (text: string, field: "iframe" | "url") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((v) => !v)} className={styles.trigger}>
        Embed
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.section}>
            <span className={styles.hint}>블로그나 Obsidian에 그대로 붙여넣으면 시각화가 표시됩니다</span>
            <div className={styles.codeRow}>
              <code className={styles.code}>{iframeSnippet}</code>
              <button
                className={styles.copyButton}
                onClick={() => handleCopy(iframeSnippet, "iframe")}
              >
                {copiedField === "iframe" ? "✓" : "복사"}
              </button>
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.section}>
            <span className={styles.hint}>Notion에서는 /embed 입력 후 붙여넣어보세요</span>
            <div className={styles.codeRow}>
              <code className={styles.code}>{embedUrl}</code>
              <button
                className={styles.copyButton}
                onClick={() => handleCopy(embedUrl, "url")}
              >
                {copiedField === "url" ? "✓" : "복사"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
