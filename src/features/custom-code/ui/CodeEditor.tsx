"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { javascript } from "@codemirror/lang-javascript";
import * as styles from "./code-editor.css";

const ReactCodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => <div className={styles.loadingBox}>에디터 로딩 중...</div>,
});

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function CodeEditor({ value, onChange, readOnly = false }: CodeEditorProps) {
  const extensions = useMemo(() => [javascript({ typescript: true })], []);

  return (
    <ReactCodeMirror
      value={value}
      onChange={onChange}
      readOnly={readOnly}
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
  );
}
