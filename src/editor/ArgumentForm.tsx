"use client";

import { useState, useImperativeHandle, forwardRef } from "react";
import { useTranslations } from "next-intl";
import { safeJsonParse } from "@/shared/lib/validate";
import * as styles from "./argument-form.css";

export interface ArgumentFormHandle {
  getArgs: () => unknown[];
}

interface ArgumentFormProps {
  paramNames: string[];
  defaultArgs?: unknown[];
  onSubmit: (args: unknown[]) => void;
}

function inferType(value: unknown): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    const inner = typeof value[0];
    if (Array.isArray(value[0])) return `${inferType(value[0])}[]`;
    return `${inner}[]`;
  }
  return typeof value;
}

export const ArgumentForm = forwardRef<ArgumentFormHandle, ArgumentFormProps>(function ArgumentForm(
  { paramNames, defaultArgs, onSubmit },
  ref,
) {
  const t = useTranslations("editor");
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const name of paramNames) initial[name] = "";
    return initial;
  });

  const updateField = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const buildArgs = (): unknown[] =>
    paramNames.map((name, i) => {
      const raw = values[name]?.trim() ?? "";
      if (raw === "") return defaultArgs?.[i];
      return safeJsonParse(raw);
    });

  useImperativeHandle(ref, () => ({
    getArgs: buildArgs,
  }));

  if (paramNames.length === 0) return null;

  return (
    <div className={styles.container}>
      {paramNames.map((name, i) => {
        const defaultVal = defaultArgs?.[i];
        const typeStr = defaultVal !== undefined ? inferType(defaultVal) : undefined;
        return (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span className={styles.label}>
              {name}
              {typeStr && <span className={styles.typeAnnotation}>: {typeStr}</span>}
            </span>
            <span className={styles.equals}>=</span>
            <input
              className={styles.input}
              value={values[name] || ""}
              onChange={(e) => updateField(name, e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit(buildArgs())}
              placeholder={defaultVal !== undefined ? JSON.stringify(defaultVal) : t("inputPlaceholder")}
            />
          </div>
        );
      })}
    </div>
  );
});
