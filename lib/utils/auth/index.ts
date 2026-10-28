import { AFTER_SIGN_IN_PATH, PASSWORD_MIN_LENGTH } from "@/lib/constants/auth";
import { translateIssue } from "@/lib/i18n/translate-issue";
import type { Translator } from "@/lib/i18n/translator";
import { zodErrorMap } from "@/lib/i18n/zod-errors";

/** Only same-origin relative paths survive, so `next` can't bounce the user to another site. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return AFTER_SIGN_IN_PATH;

  return next;
}

/** `t` is scoped to the `auth` namespace; unknown codes and raw provider messages pass through. */
export function authErrorMessage(error: { code?: string; message?: string } | string | null | undefined, t: Translator): string {
  const known = (code: string) => t.has(`errors.${code}`);

  const text = (code: string) => (code === "weak_password" ? t(`errors.${code}`, { min: PASSWORD_MIN_LENGTH }) : t(`errors.${code}`));

  if (!error) return text("fallback");

  if (typeof error === "string") return known(error) ? text(error) : error;

  if (error.code && known(error.code)) return text(error.code);

  if (error.message?.includes("provider is not enabled")) return text("provider_disabled");

  return error.message || text("fallback");
}

type FieldErrors = Record<string, string>;

interface FormIssue {
  path: PropertyKey[];
  message: string;
  minimum?: unknown;
  maximum?: unknown;
}

/** Reads a form through a Zod schema: values on success, the first translated message per field otherwise (`t` is the root translator). */
export function parseForm<T>(schema: { safeParse: (v: unknown, params?: { error: typeof zodErrorMap }) => { success: true; data: T } | { success: false; error: { issues: FormIssue[] } } }, form: HTMLFormElement, t: Translator): { data: T; errors: null } | { data: null; errors: FieldErrors } {
  const result = schema.safeParse(Object.fromEntries(new FormData(form)), { error: zodErrorMap });

  if (result.success) return { data: result.data, errors: null };

  const errors: FieldErrors = {};

  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");

    errors[key] ??= translateIssue(t, issue);
  }

  return { data: null, errors };
}
