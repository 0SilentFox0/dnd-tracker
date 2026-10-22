import { AFTER_SIGN_IN_PATH, AUTH_ERRORS, AUTH_FALLBACK_ERROR } from "@/lib/constants/auth";

/** Only same-origin relative paths survive, so `next` can't bounce the user to another site. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return AFTER_SIGN_IN_PATH;

  return next;
}

export function authErrorMessage(error: { code?: string; message?: string } | string | null | undefined): string {
  if (!error) return AUTH_FALLBACK_ERROR;

  if (typeof error === "string") return AUTH_ERRORS[error] ?? error;

  if (error.code && AUTH_ERRORS[error.code]) return AUTH_ERRORS[error.code];

  if (error.message?.includes("provider is not enabled")) return AUTH_ERRORS.provider_disabled;

  return error.message || AUTH_FALLBACK_ERROR;
}

type FieldErrors = Record<string, string>;

/** Reads a form through a Zod schema: values on success, the first message per field otherwise. */
export function parseForm<T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } } }, form: HTMLFormElement): { data: T; errors: null } | { data: null; errors: FieldErrors } {
  const result = schema.safeParse(Object.fromEntries(new FormData(form)));

  if (result.success) return { data: result.data, errors: null };

  const errors: FieldErrors = {};

  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");

    errors[key] ??= issue.message;
  }

  return { data: null, errors };
}
