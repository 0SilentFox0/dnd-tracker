import type { Translator } from "@/lib/i18n/translator";

export function keysOf(t: Translator, path: string): string[] {
  const node = t.raw(path);

  return node && typeof node === "object" ? Object.keys(node) : [];
}

export function listOf(t: Translator, path: string): string[] {
  return keysOf(t, path).map((key) => t(`${path}.${key}`));
}
