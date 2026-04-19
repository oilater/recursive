"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";
import { placeholder as placeholderExt } from "@codemirror/view";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import type { CodeLanguage } from "@/engine";
import { getEditorExtension } from "./language-extensions";

import * as styles from "./code-editor.css";

const codemirrorImport = () => import("@uiw/react-codemirror");

const ReactCodeMirror = dynamic(codemirrorImport, {
  ssr: false,
  loading: () => <div style={{ height: "100%" }} />,
});

if (typeof window !== "undefined") {
  codemirrorImport();
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  codeLanguage?: CodeLanguage;
}

export interface CodeEditorHandle {
  focus: () => void;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
  { value, onChange, readOnly = false, codeLanguage = "javascript" },
  ref,
) {
  const t = useTranslations("editor");
  const cmRef = useRef<ReactCodeMirrorRef>(null);

  useImperativeHandle(ref, () => ({
    focus: () => cmRef.current?.view?.focus(),
  }));

  const extensions = useMemo(
    () => [getEditorExtension(codeLanguage), placeholderExt(t("placeholder"))],
    [t, codeLanguage],
  );

  return (
    <div className={styles.editorRoot}>
      <ReactCodeMirror
        ref={cmRef}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        autoFocus={!readOnly}
        height="100%"
        theme={tokyoNight}
        extensions={extensions}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: false,
        }}
      />
    </div>
  );
});
