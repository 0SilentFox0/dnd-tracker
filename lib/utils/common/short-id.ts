/** `crypto.randomUUID` відсутній у незахищених контекстах (http у LAN). */
export function shortId(length = 12): string {
  const uuid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Math.random().toString(16).slice(2)}${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;

  return uuid.replaceAll("-", "").slice(0, length);
}
