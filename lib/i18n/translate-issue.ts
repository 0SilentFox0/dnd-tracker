import type { Translator } from "./translator";

import { API_ERROR_PARAMS, type ApiErrorKey, type ErrorParams } from "@/lib/constants/api-errors";

interface TranslatableIssue {
  message: string;
  minimum?: unknown;
  maximum?: unknown;
  params?: ErrorParams;
}

function toNumber(value: unknown): number | undefined {
  return typeof value === "number" || typeof value === "bigint" ? Number(value) : undefined;
}

export function translateIssue(t: Translator, issue: TranslatableIssue): string {
  if (!t.has(issue.message)) return issue.message;

  const values: ErrorParams = { ...API_ERROR_PARAMS[issue.message as ApiErrorKey], ...issue.params };

  const minimum = toNumber(issue.minimum);

  const maximum = toNumber(issue.maximum);

  if (minimum !== undefined) values.minimum = minimum;

  if (maximum !== undefined) values.maximum = maximum;

  return t(issue.message, values);
}
