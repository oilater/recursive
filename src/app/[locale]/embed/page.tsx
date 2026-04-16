import { initializeAlgorithms, getPreset } from "@/algorithm";
import { EmbedClient } from "./EmbedClient";

initializeAlgorithms();

interface EmbedPageProps {
  searchParams: Promise<{ preset?: string; code?: string; args?: string; lang?: string }>;
}

function decodeBase64(str: string): string {
  return decodeURIComponent(escape(atob(str)));
}

export default async function EmbedPage({ searchParams }: EmbedPageProps) {
  const params = await searchParams;

  let code: string | undefined;
  let args: unknown[] | undefined;
  let error: string | undefined;
  const lang = params.lang === "python" ? "python" : "javascript";

  if (params.preset) {
    const preset = getPreset(params.preset);
    if (preset) {
      code = preset.code;
      args = preset.defaultArgs;
    } else {
      error = `Unknown preset: ${params.preset}`;
    }
  } else if (params.code) {
    try {
      code = decodeBase64(params.code);
    } catch {
      error = "Invalid code parameter.";
    }
    try {
      args = params.args ? JSON.parse(params.args) : [];
    } catch {
      error = "Invalid args parameter.";
    }
  } else {
    error = "Missing code or preset parameter.";
  }

  return <EmbedClient code={code} args={args} error={error} lang={lang} />;
}
