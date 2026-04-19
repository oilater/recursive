import type { CodeLanguage } from "@/engine";

function encodeBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

interface VisualizeRunOptions {
  code: string;
  args?: unknown[];
  codeLanguage: CodeLanguage;
}

export function buildVisualizeRunUrl({ code, args, codeLanguage }: VisualizeRunOptions): string {
  const params = new URLSearchParams();
  params.set("code", encodeBase64(code));
  if (args && args.length > 0) {
    params.set("args", JSON.stringify(args));
  }
  if (codeLanguage === "python") {
    params.set("lang", "python");
  }
  return `/visualize/run?${params.toString()}`;
}
