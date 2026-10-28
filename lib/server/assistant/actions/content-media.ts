/** Media uses the existing browser editors; no uploads during preparation. */
export function contentMediaHandoff(kind: string, input: Record<string, unknown>) {
  if ((kind === "artifacts" || kind === "artifact-sets") && typeof input.icon === "string" && input.icon.length > 0) return "Іконку додайте у чинному редакторі контенту";

  if (kind === "tracks" && input.kind === "file") return "Завантажте файл у бібліотеці музики";

  return null;
}
