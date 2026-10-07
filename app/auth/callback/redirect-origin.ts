// VERCEL_URL is the per-deployment host (behind Deployment Protection, other cookie domain) — never redirect there
export function getRedirectOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (forwardedHost) {
    const proto = request.headers.get("x-forwarded-proto") === "http" ? "http" : "https";

    return `${proto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}
