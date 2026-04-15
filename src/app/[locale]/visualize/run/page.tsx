import { RunClient } from "./RunClient";

interface RunPageProps {
  searchParams: Promise<{ code?: string; args?: string }>;
}

function decodeBase64(str: string): string {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch {
    return "";
  }
}

export default async function RunPage({ searchParams }: RunPageProps) {
  const params = await searchParams;
  const code = params.code ? decodeBase64(params.code) : undefined;
  let args: unknown[] | undefined;

  if (params.args) {
    try {
      args = JSON.parse(params.args);
    } catch {}
  }

  return <RunClient code={code} args={args} />;
}
