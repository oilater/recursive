"use client";

import { useCallback, useEffect, useState as useReactState } from "react";
import { useTranslations } from "next-intl";
import type { CodeLanguage } from "@/engine";
import { ensurePyodideWorker } from "@/engine";
import * as styles from "./code-language-select.css";

const STORAGE_KEY = "recursive-default-lang";

interface CodeLanguageSelectProps {
  value: CodeLanguage | null;
  onChange: (codeLanguage: CodeLanguage) => void;
}

const CODE_LANGUAGES: { code: CodeLanguage; label: string }[] = [
  { code: "python", label: "Python" },
  { code: "javascript", label: "JS / TS" },
];

export function getDefaultCodeLanguage(): CodeLanguage {
  if (typeof window === "undefined") return "python";
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "javascript" ? "javascript" : "python";
}

export function CodeLanguageSelect({ value, onChange }: CodeLanguageSelectProps) {
  const t = useTranslations("editor");
  const [defaultCodeLanguage, setDefaultCodeLanguage] = useReactState<CodeLanguage | null>(null);
  const showSetDefault = value !== null && value !== defaultCodeLanguage;

  useEffect(() => {
    setDefaultCodeLanguage(getDefaultCodeLanguage());
  }, []);

  const handleSetDefault = useCallback(() => {
    if (!value) return;
    localStorage.setItem(STORAGE_KEY, value);
    setDefaultCodeLanguage(value);
  }, [value]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {CODE_LANGUAGES.map(({ code, label }) => (
          <button
            key={code}
            className={code === value ? styles.buttonActive : styles.button}
            onClick={() => onChange(code)}
            onMouseEnter={code === "python" ? () => ensurePyodideWorker().catch(() => {}) : undefined}
          >
            {label}{defaultCodeLanguage !== null && code === defaultCodeLanguage && <span className={styles.defaultTag}> ({t("defaultLang")})</span>}
          </button>
        ))}
      </div>
      {showSetDefault && (
        <button className={styles.defaultButton} onClick={handleSetDefault}>
          ☐ {t("setDefault")}
        </button>
      )}
    </div>
  );
}
