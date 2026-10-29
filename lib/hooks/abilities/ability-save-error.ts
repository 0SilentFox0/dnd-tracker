import { ApiError } from "@/lib/api/client";
import type { Translator } from "@/lib/i18n/translator";

interface Issue {
  path?: unknown[];
  message?: string;
}

export function abilitySaveError(err: unknown, fallback: string, t: Translator): string {
  const issues = err instanceof ApiError ? (err.body as { issues?: unknown } | null)?.issues : undefined;

  if (Array.isArray(issues)) {
    const own = (issues as Issue[]).filter((i) => i.path?.[0] === "abilities");

    if (own.length) return t("save.errors", { list: own.map((i) => `${(i.path ?? []).slice(1).join(".")}: ${i.message}`).join("; ") });
  }

  return err instanceof Error ? err.message : fallback;
}
