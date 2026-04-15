import { CustomVisualizerClient } from "./CustomVisualizerClient";

interface PlaygroundPageProps {
  searchParams: Promise<{ code?: string; args?: string }>;
}

function decodeBase64(str: string): string {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch {
    return "";
  }
}

export default async function PlaygroundPage({ searchParams }: PlaygroundPageProps) {
  const params = await searchParams;
  const initialCode = params.code ? decodeBase64(params.code) : undefined;
  let initialArgs: unknown[] | undefined;

  if (params.args) {
    try {
      initialArgs = JSON.parse(params.args);
    } catch {}
  }

  return <CustomVisualizerClient initialCode={initialCode} initialArgs={initialArgs} />;
}
