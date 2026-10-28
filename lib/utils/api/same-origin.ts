export function isSecureRequest(req: Request): boolean {
  return req.headers.get("x-forwarded-proto")?.split(",")[0].trim() === "https" || new URL(req.url).protocol === "https:";
}

/** Compare browser-facing Host and URL protocol, never forwarded host headers. */
export function isSameOriginRequest(req: Request): boolean {
  const url = new URL(req.url);

  return req.headers.get("origin") === `${url.protocol}//${req.headers.get("host") ?? url.host}`;
}
