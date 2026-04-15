"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";
import { javascript } from "@codemirror/lang-javascript";
import { placeholder as placeholderExt } from "@codemirror/view";

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
}
