import { createHighlighter, type BundledLanguage, type BundledTheme } from "shiki";

let highlighterPromise: ReturnType<typeof createHighlighter> | null = null;

export function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark"],
      langs: ["javascript"],
    });
  }
  return highlighterPromise;
}

export async function highlightCode(
  code: string,
  lang: BundledLanguage = "javascript",
  theme: BundledTheme = "github-dark",
): Promise<string> {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, {
    lang,
    theme,
    transformers: [
      {
        line(node, line) {
          node.properties["data-line"] = line;
        },
      },
    ],
  });
}
