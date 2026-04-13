"use client";

import { useState } from "react";
import type { InputConfig } from "@/entities/algorithm";
import { parseNumberArray, hasDuplicates, allPositiveIntegers } from "@/shared/lib/validate";
import * as styles from "./input-form.css";

interface InputFormProps {
  config: InputConfig;
  onSubmit: (input: Record<string, unknown>) => void;
}

export function InputForm({ config, onSubmit }: InputFormProps) {
  const [error, setError] = useState<string | null>(null);

  if (config.type === "array") {
    return <ArrayInput config={config} onSubmit={onSubmit} error={error} setError={setError} />;
  }
  if (config.type === "nk") {
    return <NKInput config={config} onSubmit={onSubmit} error={error} setError={setError} />;
  }
  return <SingleInput config={config} onSubmit={onSubmit} error={error} setError={setError} />;
}

interface SubFormProps {
  config: InputConfig;
  onSubmit: (input: Record<string, unknown>) => void;
  error: string | null;
  setError: (e: string | null) => void;
}

function ArrayInput({ config, onSubmit, error, setError }: SubFormProps) {
  const defaults = config.defaults.elements as number[];
  const [value, setValue] = useState(defaults.join(", "));

  const applyInput = (): void => {
    setError(null);
    const parts = parseNumberArray(value);

    if (!parts) {
      setError("숫자만 입력해주세요");
      return;
    }

    const max = (config.constraints.maxLength as number) || 8;
    if (parts.length > max) {
      setError(`최대 ${max}개까지 입력 가능합니다`);
      return;
    }

    if (config.constraints.noDuplicates && hasDuplicates(parts)) {
      setError("중복 값은 허용되지 않습니다");
      return;
    }

    if (!allPositiveIntegers(parts)) {
      setError("양의 정수만 입력해주세요");
      return;
    }

    onSubmit({ elements: parts });
  };

  return (
    <div className={styles.container}>
      <span className={styles.label}>배열:</span>
      <input
        className={styles.input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && applyInput()}
        placeholder="1, 2, 3"
      />
      <button className={styles.applyButton} onClick={applyInput}>
        적용
      </button>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}

function NKInput({ config, onSubmit, error, setError }: SubFormProps) {
  const [n, setN] = useState(String(config.defaults.n ?? 4));
  const [r, setR] = useState(String(config.defaults.r ?? 2));

  const applyInput = (): void => {
    setError(null);
    const nVal = parseInt(n, 10);
    const rVal = parseInt(r, 10);

    if (isNaN(nVal) || isNaN(rVal)) {
      setError("숫자를 입력해주세요");
      return;
    }

    const maxN = (config.constraints.maxN as number) || 8;
    if (nVal < 1 || nVal > maxN) {
      setError(`n은 1~${maxN} 범위여야 합니다`);
      return;
    }
    if (rVal < 1 || rVal > nVal) {
      setError(`r은 1~${nVal} 범위여야 합니다`);
      return;
    }

    onSubmit({ n: nVal, r: rVal });
  };

  return (
    <div className={styles.container}>
      <span className={styles.label}>n:</span>
      <input
        className={styles.smallInput}
        value={n}
        onChange={(e) => setN(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && applyInput()}
      />
      <span className={styles.label}>r:</span>
      <input
        className={styles.smallInput}
        value={r}
        onChange={(e) => setR(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && applyInput()}
      />
      <button className={styles.applyButton} onClick={applyInput}>
        적용
      </button>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}

function SingleInput({ config, onSubmit, error, setError }: SubFormProps) {
  const [value, setValue] = useState(String(config.defaults.n ?? 4));

  const applyInput = (): void => {
    setError(null);
    const val = parseInt(value, 10);

    if (isNaN(val)) {
      setError("숫자를 입력해주세요");
      return;
    }

    const min = (config.constraints.min as number) ?? 1;
    const max = (config.constraints.max as number) ?? 8;
    if (val < min || val > max) {
      setError(`${min}~${max} 범위여야 합니다`);
      return;
    }

    onSubmit({ n: val });
  };

  return (
    <div className={styles.container}>
      <span className={styles.label}>{config.label}:</span>
      <input
        className={styles.smallInput}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && applyInput()}
      />
      <button className={styles.applyButton} onClick={applyInput}>
        적용
      </button>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
