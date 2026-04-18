"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CodeEditor, ArgumentForm, CODE_EXAMPLES } from "@/editor";
import type { ArgumentFormHandle } from "@/editor";
import { getCodeLanguageAdapter } from "@/engine";
import type { CodeLanguage } from "@/engine";
import { useCodeLanguage } from "@/shared/hooks/useCodeLanguage";
import { CodeLanguageSelect } from "@/shared/ui";
import {
  loadEditorSession,
  saveEditorSession,
} from "@/shared/lib/editor-session-storage";
import * as styles from "./home.css";

export function HomeEditor() {
  const t = useTranslations();
  const router = useRouter();
  const { codeLanguage, defaultCodeLanguage, setCodeLanguage, setDefaultCodeLanguage } =
    useCodeLanguage();

  const [code, setCode] = useState("");
  const [paramNames, setParamNames] = useState<string[]>([]);
  const [hasTopLevelCall, setHasTopLevelCall] = useState(false);
  const [argsValid, setArgsValid] = useState(true);
  const [restoredArgs, setRestoredArgs] = useState<unknown[] | undefined>(undefined);

  const hasCode = code.trim().length > 0;
  const showArgumentForm = paramNames.length > 0 && !hasTopLevelCall;
  const canRun = hasCode && !!codeLanguage && (!showArgumentForm || argsValid);
  const argFormRef = useRef<ArgumentFormHandle>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = loadEditorSession();
    if (!saved) return;
    setCodeLanguage(saved.codeLanguage);
    setCode(saved.code);
    setRestoredArgs(saved.args);
    getCodeLanguageAdapter(saved.codeLanguage)
      .analyzeUsage(saved.code)
      .then((usage) => {
        setParamNames(usage.paramNames);
        setHasTopLevelCall(usage.hasTopLevelCall);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCodeLanguageChange = (lang: CodeLanguage) => {
    setCodeLanguage(lang);
    setCode("");
    setParamNames([]);
    setHasTopLevelCall(false);
    setRestoredArgs(undefined);
    saveEditorSession({ code: "", codeLanguage: lang });
    setTimeout(() => {
      const cm = editorRef.current?.querySelector(".cm-content") as HTMLElement | null;
      cm?.focus();
    }, 0);
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (!codeLanguage) return;
    saveEditorSession({ code: newCode, codeLanguage });
    getCodeLanguageAdapter(codeLanguage)
      .analyzeUsage(newCode)
      .then((usage) => {
        setParamNames(usage.paramNames);
        setHasTopLevelCall(usage.hasTopLevelCall);
      });
  };

  const handleRun = (args: unknown[]) => {
    if (!codeLanguage) return;
    saveEditorSession({ code, codeLanguage, args });
    const cleanCode = getCodeLanguageAdapter(codeLanguage).prepareForExecution(code);
    const encoded = btoa(unescape(encodeURIComponent(cleanCode)));
    const argsStr = args.length > 0 ? `&args=${encodeURIComponent(JSON.stringify(args))}` : "";
    const langStr = codeLanguage === "python" ? `&lang=python` : "";
    router.push(`/visualize/run?code=${encodeURIComponent(encoded)}${argsStr}${langStr}`);
  };

  return (
    <div>
      <div className={styles.actionBar}>
        <CodeLanguageSelect
          value={codeLanguage}
          defaultValue={defaultCodeLanguage}
          onChange={handleCodeLanguageChange}
          onSetDefault={setDefaultCodeLanguage}
        />
        <div className={styles.actionRight}>
          {showArgumentForm && (
            <ArgumentForm
              ref={argFormRef}
              paramNames={paramNames}
              defaultArgs={restoredArgs}
              onSubmit={handleRun}
              onValidityChange={setArgsValid}
            />
          )}
          <button
            className={styles.runButton}
            onClick={() => {
              const args = argFormRef.current?.getArgs() ?? [];
              handleRun(args);
            }}
            disabled={!canRun}
          >
            {t("custom.run")}
          </button>
        </div>
      </div>

      <div className={styles.editorCard} ref={editorRef}>
        <div className={styles.editorBody}>
          <CodeEditor
            value={code}
            onChange={handleCodeChange}
            codeLanguage={codeLanguage ?? "javascript"}
          />
        </div>
      </div>

      <div className={styles.exampleRow}>
        <button
          type="button"
          className={styles.exampleButton}
          onClick={() => handleCodeChange(CODE_EXAMPLES[codeLanguage ?? "javascript"].recursion)}
        >
          {t("editor.example1")}
        </button>
        <button
          type="button"
          className={styles.exampleButton}
          onClick={() => handleCodeChange(CODE_EXAMPLES[codeLanguage ?? "javascript"].closure)}
        >
          {t("editor.example2")}
        </button>
      </div>
    </div>
  );
}
