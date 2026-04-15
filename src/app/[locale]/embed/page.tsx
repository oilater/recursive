import { initializeAlgorithms, getPreset } from "@/algorithm";
import { EmbedClient } from "./EmbedClient";

initializeAlgorithms();

interface EmbedPageProps {
  searchParams: Promise<{ preset?: string; code?: string; args?: string }>;
}

export default async function EmbedPage({ searchParams }: EmbedPageProps) {
  const params = await searchParams;
  let presetCode: string | undefined;
  let presetArgs: unknown[] | undefined;

  if (params.preset) {
    const preset = getPreset(params.preset);
    if (preset) {
      presetCode = preset.code;
      presetArgs = preset.defaultArgs;
    }
  }

  return (
    <EmbedClient
      presetCode={presetCode}
      presetArgs={presetArgs}
      codeParam={params.code}
      argsParam={params.args}
    />
  );
}
