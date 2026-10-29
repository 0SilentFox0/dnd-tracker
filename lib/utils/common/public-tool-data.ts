/** Defense at both transports, including historical rows read by legacy tools. */
export function publicToolData(value: unknown): unknown {
  if (typeof value === "string") return value.replace(/https?:\/\/[^\s"'<>]+/gi, candidate => {
    try {
      const url = new URL(candidate);

      const sensitive = [...url.searchParams.keys()].some(key => /token|signature|credential|secret|api[-_]?key/i.test(key));

      return sensitive || url.username || url.password || url.pathname.includes("/object/sign/") ? "[hidden link]" : candidate;
    } catch { return candidate; }
  });

  if (value instanceof Date) return value.toJSON();

  if (Array.isArray(value)) return value.map(publicToolData);

  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, data]) => [key, publicToolData(data)]));

  return value;
}
