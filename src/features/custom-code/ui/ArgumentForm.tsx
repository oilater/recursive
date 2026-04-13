"use client";

import { useState } from "react";
import { safeJsonParse } from "@/shared/lib/validate";
import * as styles from "./argument-form.css";

interface ArgumentFormProps {
  paramNames: string[];
  onSubmit: (args: unknown[]) => void;
}

export function ArgumentForm({ paramNames, onSubmit }: ArgumentFormProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const name of paramNames) {
      initial[name] = "";
    }
    return initial;
  });

  const updateField = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const submitArguments = () => {
    const parsedArgs = paramNames.map((name) => {
      const raw = values[name]?.trim() ?? "";
      if (raw === "") return undefined;
      return safeJsonParse(raw);
    });
    onSubmit(parsedArgs);
  };

  if (paramNames.length === 0) {
    return (
      <div className={styles.container}>
        <span className={styles.label}>인자 없음</span>
        <button
          className={styles.input}
          style={{ width: "auto", cursor: "pointer", backgroundColor: "#22c55e20" }}
          onClick={() => onSubmit([])}
        >
          실행
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {paramNames.map((name) => (
        <div key={name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className={styles.label}>{name}:</span>
          <input
            className={styles.input}
            value={values[name] || ""}
            onChange={(e) => updateField(name, e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitArguments()}
            placeholder="값 입력 (예: 5, [1,2,3])"
          />
        </div>
      ))}
      <span className={styles.hint}>숫자, 배열([1,2,3]), 문자열(&quot;abc&quot;) 형태로 입력하세요</span>
    </div>
  );
}
