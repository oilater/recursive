"use client";

import type { Language } from "@/engine";
import * as styles from "./language-select.css";

interface LanguageSelectProps {
  value: Language;
  onChange: (language: Language) => void;
}

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "python", label: "Python" },
  { code: "javascript", label: "JS / TS" },
];

export function LanguageSelect({ value, onChange }: LanguageSelectProps) {
  return (
    <div className={styles.container}>
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          className={code === value ? styles.buttonActive : styles.button}
          onClick={() => onChange(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
