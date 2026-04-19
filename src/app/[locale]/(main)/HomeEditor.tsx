"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CodeEditor, ArgumentForm, CODE_EXAMPLES } from "@/editor";
import type { ArgumentFormHandle, CodeEditorHandle } from "@/editor";
import { getCodeLanguageAdapter } from "@/engine";
import type { CodeLanguage } from "@/engine";
import { useCodeLanguage } from "@/shared/hooks/useCodeLanguage";
import { useEditorSession } from "@/shared/hooks/useEditorSession";
import { CodeLanguageSelect } from "@/shared/ui";
import { buildVisualizeRunUrl } from "@/shared/lib/visualize-url";
import * as styles from "./home.css";

export function HomeEditor() {
  const t = useTranslations();
  const router = useRouter();
  const { codeLanguage, defaultCodeLanguage, setCodeLanguage, setDefaultCodeLanguage } =
    useCodeLanguage();

  const session = useEditorSession({
    currentLanguage: codeLanguage,
    onLanguageRestored: setCodeLanguage,
  });

  const [argsValid, setArgsValid] = useState(true);
  const argFormRef = useRef<ArgumentFormHandle>(null);
  const editorRef = useRef<CodeEditorHandle>(null);

  const hasCode = session.code.trim().length > 0;
  const showArgumentForm = session.paramNames.length > 0 && !session.hasTopLevelCall;
  const canRun = hasCode && !!codeLanguage && (!showArgumentForm || argsValid);

  const handleCodeLanguageChange = (lang: CodeLanguage) => {
    setCodeLanguage(lang);
    session.resetForLanguage(lang);
    editorRef.current?.focus();
  };

  const handleRun = (args: unknown[]) => {
    if (!codeLanguage) return;
    session.persistForRun(args);
    const cleanCode = getCodeLanguageAdapter(codeLanguage).prepareForExecution(session.code);
    router.push(buildVisualizeRunUrl({ code: cleanCode, args, codeLanguage }));
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
              paramNames={session.paramNames}
              defaultArgs={session.restoredArgs}
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

      <div className={styles.editorCard}>
        <div className={styles.editorBody}>
          <CodeEditor
            ref={editorRef}
            value={session.code}
            onChange={session.onCodeChange}
            codeLanguage={codeLanguage ?? "javascript"}
          />
        </div>
      </div>

      <div className={styles.exampleRow}>
        <button
          type="button"
          className={styles.exampleButton}
          onClick={() => session.onCodeChange(CODE_EXAMPLES[codeLanguage ?? "javascript"].recursion)}
        >
          {t("editor.example1")}
        </button>
        <button
          type="button"
          className={styles.exampleButton}
          onClick={() => session.onCodeChange(CODE_EXAMPLES[codeLanguage ?? "javascript"].closure)}
        >
          {t("editor.example2")}
        </button>
      </div>
    </div>
  );
}
