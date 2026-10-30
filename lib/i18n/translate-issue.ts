import type { Translator } from "./translator";

import { API_ERROR_PARAMS, type ApiErrorKey, type ErrorParams } from "@/lib/constants/api-errors";
import type { TextArg } from "@/types/text";

interface TranslatableIssue {
  message: string;
  minimum?: unknown;
  maximum?: unknown;
  params?: Record<string, TextArg>;
}

export const JOIN_KEY = "$join";

export const CAPITALIZE_KEY = "$capitalize";

function toNumber(value: unknown): number | undefined {
  return typeof value === "number" || typeof value === "bigint" ? Number(value) : undefined;
}

/** Nested refs resolve to text first; string params are content (names) and are never translated. */
function plainParams(t: Translator, params: Record<string, TextArg> | undefined): ErrorParams | undefined {
  if (!params) return undefined;

  return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, typeof value === "object" ? translateIssue(t, value) : value]));
}

const placeholderCache = new Map<string, string[]>();

function placeholders(raw: string): string[] {
  const cached = placeholderCache.get(raw);

  if (cached) return cached;

  const names = [...new Set([...raw.matchAll(/\{\s*(\w+)\s*[,}]/g)].map((match) => match[1] as string))];

  placeholderCache.set(raw, names);

  return names;
}

function withEmptyDefaults(t: Translator, key: string, params: ErrorParams): ErrorParams {
  const raw = t.raw(key);

  if (typeof raw !== "string") return params;

  return { ...Object.fromEntries(placeholders(raw).map((name) => [name, ""])), ...params };
}

export function issueParams(issue: Omit<TranslatableIssue, "params"> & { params?: ErrorParams }): ErrorParams {
  const values: ErrorParams = { ...API_ERROR_PARAMS[issue.message as ApiErrorKey], ...issue.params };

  const minimum = toNumber(issue.minimum);

  const maximum = toNumber(issue.maximum);

  if (minimum !== undefined) values.minimum = minimum;

  if (maximum !== undefined) values.maximum = maximum;

  return values;
}

export function translateIssue(t: Translator, issue: TranslatableIssue): string {
  const params = plainParams(t, issue.params);

  if (issue.message === JOIN_KEY) {
    const { separator = "", ...parts } = params ?? {};

    return Object.values(parts).join(String(separator));
  }

  if (issue.message === CAPITALIZE_KEY) {
    const text = String(params?.p0 ?? "");

    return text.charAt(0).toLocaleUpperCase() + text.slice(1);
  }

  return t.has(issue.message) ? t(issue.message, withEmptyDefaults(t, issue.message, issueParams({ ...issue, params }))) : issue.message;
}
