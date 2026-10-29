/** Returns a translation key; media uses the existing browser editors; no uploads during preparation. */
export function contentMediaHandoff(kind: string, input: Record<string, unknown>) {
  if ((kind === "artifacts" || kind === "artifact-sets") && typeof input.icon === "string" && input.icon.length > 0) return "assistant.media.icon";

  if (kind === "tracks" && input.kind === "file") return "assistant.media.trackFile";

  return null;
}
