"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { StepGeneratorResult, PresetAlgorithm } from "@/algorithm";
import { executeCustomCodeLazy, analyzeCodeLazy } from "@/engine/lazy";
import { highlightCode } from "@/shared/lib/shiki";
import { buildEmbedUrl } from "@/shared/lib/embed-url";
import { Badge, Header, StatusMessage, EmbedDropdown } from "@/shared/ui";
import { ChevronLeftIcon } from "@/shared/ui/icons";
import { PresetViewer } from "./PresetViewer";
import * as styles from "./visualize-page.css";

interface VisualizerClientProps {
  preset: PresetAlgorithm;
}

interface ExecState {
  result: StepGeneratorResult | null;
  codeHtml: string;
  hasRecursion: boolean;
}

const INITIAL_EXEC: ExecState = {
  result: null,
  codeHtml: "",
  hasRecursion: true,
};

export function VisualizerClient({ preset }: VisualizerClientProps) {
  const t = useTranslations();
  const [exec, setExec] = useState<ExecState>(INITIAL_EXEC);
  const [error, setError] = useState<string | null>(null);
  const [paramNames, setParamNames] = useState<string[]>([]);

  const embedUrl = useMemo(() => buildEmbedUrl({ preset: preset.id }), [preset.id]);

  useEffect(
    function analyzePresetParams() {
      analyzeCodeLazy(preset.code)
        .then(({ analysis }) => setParamNames(analysis.entryParamNames))
        .catch(() => {});
    },
    [preset.code],
  );

  const runCode = async (args: unknown[]) => {
    setError(null);
    try {
      const [execResult, html] = await Promise.all([
        executeCustomCodeLazy(preset.code, args),
        highlightCode(preset.code),
      ]);
      setExec({
        result: execResult.result,
        hasRecursion: execResult.analysis.hasRecursion,
        codeHtml: html,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(
    function executeInitial() {
      runCode(preset.defaultArgs);
    },
    [preset],
  );

  const presetHeader = (
    <Header
      left={<a href="/" className={styles.backLink}><ChevronLeftIcon size={14} />{t("visualizer.backToList")}</a>}
      center={
        <>
          <span className={styles.algoTitle}>{t(`algorithm.${preset.id}.name`)}</span>
          <Badge variant={preset.difficulty}>{t(`difficulty.${preset.difficulty}`)}</Badge>
        </>
      }
      right={<EmbedDropdown embedUrl={embedUrl} />}
    />
  );

  if (error && !exec.result) {
    return (
      <div className={styles.page}>
        {presetHeader}
        <StatusMessage variant="error">{error}</StatusMessage>
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <button
            onClick={() => { setError(null); runCode(preset.defaultArgs); }}
            style={{
              padding: "8px 20px",
              backgroundColor: "transparent",
              color: "#94a3b8",
              border: "1px solid #334155",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Reset to defaults
          </button>
        </div>
      </div>
    );
  }

  if (!exec.result) {
    return (
      <div className={styles.page}>
        {presetHeader}
        <StatusMessage variant="loading">{t("visualizer.running")}</StatusMessage>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {presetHeader}
      <PresetViewer
        result={exec.result}
        codeHtml={exec.codeHtml}
        hasRecursion={exec.hasRecursion}
        preset={preset}
        paramNames={paramNames}
        onRunCode={runCode}
        error={error}
      />
    </div>
  );
}
