const BASE_URL = "https://recursive-ochre.vercel.app";

function encodeBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

export function buildEmbedUrl(options: { preset: string } | { code: string; args?: unknown[] }): string {
  const url = new URL("/embed", BASE_URL);

  if ("preset" in options) {
    url.searchParams.set("preset", options.preset);
  } else {
    url.searchParams.set("code", encodeBase64(options.code));
    if (options.args && options.args.length > 0) {
      url.searchParams.set("args", JSON.stringify(options.args));
    }
  }

  return url.toString();
}

export function buildIframeSnippet(embedUrl: string, height = 600): string {
  return `<iframe src="${embedUrl}" width="100%" height="${height}" style="border:none;border-radius:8px;" />`;
}
