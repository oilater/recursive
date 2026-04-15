"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { javascript } from "@codemirror/lang-javascript";
import { placeholder as placeholderExt } from "@codemirror/view";
import * as styles from "./code-editor.css";

const ReactCodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => <div className={styles.loadingBox}>...</div>,
});

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function CodeEditor({ value, onChange, readOnly = false }: CodeEditorProps) {
  const t = useTranslations("editor");
  const extensions = useMemo(
    () => [javascript({ typescript: true }), placeholderExt(t("placeholder"))],
    [t],
  );

  return (
    <div className={styles.editorRoot}>
      <ReactCodeMirror
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        autoFocus={!readOnly}
        height="100%"
        theme="dark"
        extensions={extensions}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: !readOnly,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: false,
        }}
      />
    </div>
  );
}
