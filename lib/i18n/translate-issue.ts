import type { Translator } from "./translator";

interface TranslatableIssue {
  message: string;
  minimum?: unknown;
  maximum?: unknown;
}

function toNumber(value: unknown): number | undefined {
  return typeof value === "number" || typeof value === "bigint" ? Number(value) : undefined;
}

export function translateIssue(t: Translator, issue: TranslatableIssue): string {
  if (!t.has(issue.message)) return issue.message;

  const values: Record<string, number> = {};

  const minimum = toNumber(issue.minimum);

  const maximum = toNumber(issue.maximum);

  if (minimum !== undefined) values.minimum = minimum;

  if (maximum !== undefined) values.maximum = maximum;

  return t(issue.message, values);
}
