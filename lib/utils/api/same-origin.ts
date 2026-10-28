/** Compare browser-facing Host and URL protocol, never forwarded host headers. */
export function isSameOriginRequest(req: Request): boolean {
  const url = new URL(req.url);

  return req.headers.get("origin") === `${url.protocol}//${req.headers.get("host") ?? url.host}`;
}
