import type { Messages } from "use-intl";

import { CAPITALIZE_KEY, JOIN_KEY, translateIssue } from "./translate-issue";
import type { Translator } from "./translator";

import type { LogLine, TextArg, TextRef } from "@/types/text";

type Flatten<T, P extends string> = { [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Flatten<T[K], `${P}${K}.`> }[keyof T & string];

export type AppMessageKey = { [N in keyof Messages & string]: Flatten<Messages[N], `${N}.`> }[keyof Messages & string];

export function textRef(message: AppMessageKey, params?: Record<string, TextArg>): TextRef {
  return params ? { message, params } : { message };
}

/** For keys built at runtime (`battleTerms.crits.${source}…`); each dynamic family needs a `label-keys-<ns>` test. */
export function dynamicTextRef(message: string, params?: Record<string, TextArg>): TextRef {
  return params ? { message, params } : { message };
}

/** Concatenates lines; plain strings collapse into one string, otherwise a catalog-free `$join` ref that `formatText` resolves. */
export function joinLines(parts: readonly LogLine[], separator = ""): LogLine {
  if (parts.every((part) => typeof part === "string")) return parts.join(separator);

  return { message: JOIN_KEY, params: { separator, ...Object.fromEntries(parts.map((part, index) => [`p${index}`, part])) } };
}

/** Capitalizes at render time, after the locale text is known. */
export function capitalizeLine(line: LogLine): LogLine {
  if (typeof line === "string") return line.charAt(0).toLocaleUpperCase() + line.slice(1);

  return { message: CAPITALIZE_KEY, params: { p0: line } };
}

/** Stable identity of a line for sets and maps. */
export function lineKey(line: LogLine): string {
  return typeof line === "string" ? line : JSON.stringify(line);
}

function isRef(value: unknown): value is TextRef {
  return typeof value === "object" && value !== null && typeof (value as TextRef).message === "string";
}

export function formatText(t: Translator, line: LogLine): string {
  return isRef(line) ? translateIssue(t, line) : line;
}
