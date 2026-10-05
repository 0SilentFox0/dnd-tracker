import { ApiError } from "@/lib/api/client";

interface Issue {
  path?: unknown[];
  message?: string;
}

export function abilitySaveError(err: unknown, fallback: string): string {
  const issues = err instanceof ApiError ? (err.body as { error?: unknown } | null)?.error : undefined;

  if (Array.isArray(issues)) {
    const own = (issues as Issue[]).filter((i) => i.path?.[0] === "abilities");

    if (own.length) return `Помилки у вміннях: ${own.map((i) => `${(i.path ?? []).slice(1).join(".")}: ${i.message}`).join("; ")}`;
  }

  return err instanceof Error ? err.message : fallback;
}
