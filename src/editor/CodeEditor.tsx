"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { javascript } from "@codemirror/lang-javascript";
import { placeholder as placeholderExt } from "@codemirror/view";
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
  const extensions = useMemo(
    () => [javascript({ typescript: true }), placeholderExt("여기에 코드를 붙여넣으세요")],
    [],
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
