import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import type { CodeLanguage } from "@/engine";

export function getEditorExtension(codeLanguage: CodeLanguage) {
  switch (codeLanguage) {
    case "javascript":
      return javascript({ typescript: true });
    case "python":
      return python();
  }
}
