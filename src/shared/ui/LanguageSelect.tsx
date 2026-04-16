"use client";

import { useCallback, useState as useReactState } from "react";
import { useTranslations } from "next-intl";
import type { Language } from "@/engine";
import * as styles from "./language-select.css";

const STORAGE_KEY = "recursive-default-lang";

interface LanguageSelectProps {
  value: Language;
  onChange: (language: Language) => void;
}

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "python", label: "Python" },
  { code: "javascript", label: "JS / TS" },
];

export function getDefaultLanguage(): Language {
  if (typeof window === "undefined") return "python";
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "javascript" ? "javascript" : "python";
}

export function LanguageSelect({ value, onChange }: LanguageSelectProps) {
  const t = useTranslations("editor");
  const [defaultLang, setDefaultLang] = useReactState(() => getDefaultLanguage());
  const showSetDefault = value !== defaultLang;

  const handleSetDefault = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, value);
    setDefaultLang(value);
  }, [value]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {LANGUAGES.map(({ code, label }) => (
          <button
            key={code}
            className={code === value ? styles.buttonActive : styles.button}
            onClick={() => onChange(code)}
          >
            {label}{code === defaultLang && <span className={styles.defaultTag}> ({t("defaultLang")})</span>}
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
