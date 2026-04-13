"use client";

import { useState, useImperativeHandle, forwardRef } from "react";
import { safeJsonParse } from "@/shared/lib/validate";
import * as styles from "./argument-form.css";

export interface ArgumentFormHandle {
  getArgs: () => unknown[];
}

interface ArgumentFormProps {
  paramNames: string[];
  onSubmit: (args: unknown[]) => void;
}

export const ArgumentForm = forwardRef<ArgumentFormHandle, ArgumentFormProps>(function ArgumentForm(
  { paramNames, onSubmit },
  ref
) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const name of paramNames) initial[name] = "";
    return initial;
  });

  const updateField = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const buildArgs = (): unknown[] =>
    paramNames.map((name) => {
      const raw = values[name]?.trim() ?? "";
      if (raw === "") return undefined;
      return safeJsonParse(raw);
    });

  useImperativeHandle(ref, () => ({
    getArgs: buildArgs,
  }));

  if (paramNames.length === 0) return null;

  return (
    <div className={styles.container}>
      {paramNames.map((name) => (
        <div key={name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className={styles.label}>{name}:</span>
          <input
            className={styles.input}
            value={values[name] || ""}
            onChange={(e) => updateField(name, e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit(buildArgs())}
            placeholder="예: 5, [1,2,3]"
          />
        </div>
      ))}
    </div>
  );
});
