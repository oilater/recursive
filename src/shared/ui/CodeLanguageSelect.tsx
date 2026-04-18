"use client";

import { useTranslations } from "next-intl";
import type { CodeLanguage } from "@/engine";
import { getCodeLanguageAdapter, listCodeLanguageAdapters } from "@/engine";
import * as styles from "./code-language-select.css";

interface CodeLanguageSelectProps {
  value: CodeLanguage | null;
  defaultValue: CodeLanguage | null;
  onChange: (codeLanguage: CodeLanguage) => void;
  onSetDefault: (codeLanguage: CodeLanguage) => void;
}

const CODE_LANGUAGES = listCodeLanguageAdapters().map((a) => ({
  code: a.id,
  label: a.label,
}));

export function CodeLanguageSelect({
  value,
  defaultValue,
  onChange,
  onSetDefault,
}: CodeLanguageSelectProps) {
  const t = useTranslations("editor");
  const showSetDefault = value !== null && value !== defaultValue;

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {CODE_LANGUAGES.map(({ code, label }) => (
          <button
            key={code}
            className={code === value ? styles.buttonActive : styles.button}
            onClick={() => onChange(code)}
            onMouseEnter={() => getCodeLanguageAdapter(code).onSelected?.()}
          >
            {label}
            {defaultValue !== null && code === defaultValue && (
              <span className={styles.defaultTag}> ({t("defaultLang")})</span>
            )}
          </button>
        ))}
      </div>
      {showSetDefault && value && (
        <button className={styles.defaultButton} onClick={() => onSetDefault(value)}>
          ☐ {t("setDefault")}
        </button>
      )}
    </div>
  );
}
