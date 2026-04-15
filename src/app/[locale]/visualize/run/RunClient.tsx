"use client";

import { useState, useEffect } from "react";
import type { StepGeneratorResult } from "@/algorithm";
import { executeCustomCode } from "@/engine";
import { highlightCode } from "@/shared/lib/shiki";
import { Header, StatusMessage } from "@/shared/ui";
import { ChevronLeftIcon } from "@/shared/ui/icons";
import { PlaygroundViewer } from "../playground/PlaygroundViewer";
import * as styles from "../playground/custom-page.css";

interface RunClientProps {
  code?: string;
  args?: unknown[];
}

interface ExecState {
  result: StepGeneratorResult | null;
  codeHtml: string;
  hasRecursion: boolean;
  finalReturnValue: unknown;
  consoleLogs: Array<{ text: string; stepIdx: number }>;
}

const INITIAL_EXEC: ExecState = {
  result: null,
  codeHtml: "",
  hasRecursion: true,
  finalReturnValue: undefined,
  consoleLogs: [],
};

export function RunClient({ code, args }: RunClientProps) {
  const [exec, setExec] = useState<ExecState>(INITIAL_EXEC);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    function execute() {
      if (!code) {
        setError("No code provided.");
        return;
      }

      (async () => {
        try {
          const [execResult, html] = await Promise.all([
            executeCustomCode(code, args ?? []),
            highlightCode(code),
          ]);
          setExec({
            result: execResult.result,
            codeHtml: html,
            hasRecursion: execResult.analysis.hasRecursion,
            finalReturnValue: execResult.finalReturnValue,
            consoleLogs: execResult.consoleLogs ?? [],
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })();
    },
    [code, args],
  );

  if (error) {
    return (
      <div className={styles.page}>
        <Header left={<a href="/" className={styles.backLink}><ChevronLeftIcon size={14} />Home</a>} />
        <StatusMessage variant="error">{error}</StatusMessage>
      </div>
    );
  }

  if (!exec.result) {
    return (
      <div className={styles.page}>
        <Header left={<a href="/" className={styles.backLink}><ChevronLeftIcon size={14} />Home</a>} />
        <StatusMessage variant="loading">Running...</StatusMessage>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header left={<a href="/" className={styles.backLink}><ChevronLeftIcon size={14} />Home</a>} />
      <PlaygroundViewer
        result={exec.result}
        codeHtml={exec.codeHtml}
        hasRecursion={exec.hasRecursion}
        finalReturnValue={exec.finalReturnValue}
        consoleLogs={exec.consoleLogs}
      />
    </div>
  );
}
