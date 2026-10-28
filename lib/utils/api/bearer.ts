export function bearerToken(req: { headers: Headers }): string | null {
  const header = req.headers.get("authorization");

  if (header === null) return null;

  return header.match(/^Bearer\s+(.+)$/i)?.[1].trim() ?? "";
}
