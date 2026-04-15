"use client";

import { useState, useEffect } from "react";
import type { StepGeneratorResult } from "@/algorithm";
import { executeCustomCode } from "@/engine";
import { highlightCode } from "@/shared/lib/shiki";
import { StatusMessage } from "@/shared/ui";
import { PoweredByBadge } from "@/shared/ui/PoweredByBadge";
import { EmbedViewer } from "./EmbedViewer";
import * as styles from "./embed.css";

interface EmbedClientProps {
  code?: string;
  args?: unknown[];
  error?: string;
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

export function EmbedClient({ code, args, error: initialError }: EmbedClientProps) {
  const [exec, setExec] = useState<ExecState>(INITIAL_EXEC);
  const [error, setError] = useState<string | null>(initialError ?? null);

  useEffect(
    function execute() {
      if (!code || initialError) return;

      (async () => {
        try {
          const [execResult, html] = await Promise.all([
            executeCustomCode(code, args ?? []),
            highlightCode(code),
          ]);
          if (execResult.result.steps.length === 0) {
            setError("No steps generated. The code may need arguments (&args=...).");
            return;
          }
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
    [code, args, initialError],
  );

  if (error) {
    return (
      <div className={styles.page}>
        <StatusMessage variant="error">{error}</StatusMessage>
      </div>
    );
  }

  if (!exec.result) {
    return (
      <div className={styles.page}>
        <StatusMessage variant="loading">Loading...</StatusMessage>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <EmbedViewer
        result={exec.result}
        codeHtml={exec.codeHtml}
        hasRecursion={exec.hasRecursion}
        finalReturnValue={exec.finalReturnValue}
        consoleLogs={exec.consoleLogs}
      />
      <PoweredByBadge />
    </div>
  );
}
