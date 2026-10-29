import { isChallengeRating } from "@/lib/constants/challenge";
import { BOOLEAN_WORDS, FALSE_WORDS, TRUE_WORDS } from "@/lib/constants/import-aliases";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { normalizeDiceText } from "@/lib/utils/common/dice";
import { specialAbilitiesToAbilities } from "@/lib/utils/units/special-abilities";
import { parseAttacksDetailed, parseSpecialAbilities } from "@/lib/utils/units/unit-parsing";
import type { ImportField, ImportKind, ImportMessage } from "@/types/content-import";

export type ParsedValue = { value?: unknown; issue?: ImportMessage; warning?: ImportMessage };

const detail = (key: string, params?: ImportMessage["params"]): ImportMessage => ({ message: `contentImport.details.${key}`, ...(params && { params }) });

export const isEmptyValue = (v: unknown) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

export const normalizeHeader = (h: string) => h.replace(/^﻿/, "").replace(/[_’]/g, (c) => (c === "_" ? " " : "'")).trim().toLocaleLowerCase("uk").replace(/\s+/g, " ");

const EMPTY_MARK = /^[—–-]+$/;

const FORMULA_START = /^[=+\-@\t\r]/;

const PLAIN_NUMBER = /^[+-]?\d+([.,]\d+)?$/;

export const guardFormula = (v: string) => ((FORMULA_START.test(v) && !PLAIN_NUMBER.test(v)) || /^'+[=+\-@\t\r]/.test(v) ? `'${v}` : v);

const unguardFormula = (v: string) => (/^'+[=+\-@\t\r]/.test(v) ? v.slice(1) : v);

function parseInteger(field: ImportField, raw: unknown): ParsedValue {
  if (typeof raw === "number") return Number.isFinite(raw) ? { value: Math.trunc(raw) } : { issue: detail("integerExpected") };

  const s = String(raw);

  const word = field.numberWords?.[normalizeHeader(s)];

  if (word !== undefined) return { value: word };

  const m = /[+-]?\d+/.exec(s);

  return m ? { value: parseInt(m[0], 10) } : { issue: detail("integerExpectedGot", { got: s }) };
}

function parseDecimal(raw: unknown): ParsedValue {
  if (typeof raw === "number") return Number.isFinite(raw) ? { value: raw } : { issue: detail("numberExpected") };

  const s = String(raw);

  const m = /[+-]?\d+(\.\d+)?/.exec(s.replace(",", "."));

  return m ? { value: parseFloat(m[0]) } : { issue: detail("numberExpectedGot", { got: s }) };
}

function parseBoolean(raw: unknown): ParsedValue {
  if (typeof raw === "boolean") return { value: raw };

  const s = normalizeHeader(String(raw));

  if (TRUE_WORDS.has(s)) return { value: true };

  if (FALSE_WORDS.has(s)) return { value: false };

  return { issue: detail("booleanExpected", { got: String(raw) }) };
}

function matchEnum(field: ImportField, raw: string): string | null {
  const s = normalizeHeader(raw);

  for (const v of field.enumValues ?? []) {
    if (normalizeHeader(v) === s || (field.enumLabels?.[v] ?? []).some((l) => normalizeHeader(l) === s)) return v;
  }

  return null;
}

const LATIN_ONLY = /^[\x20-\x7e]+$/;

// the message of each locale picks its own param: `options` (first accepted label) or `optionsEn` (first Latin label, else the value)
const enumHint = (field: ImportField) => {
  const values = field.enumValues ?? [];

  return {
    options: values.map((v) => field.enumLabels?.[v]?.[0] ?? v).join(", "),
    optionsEn: values.map((v) => field.enumLabels?.[v]?.find((l) => LATIN_ONLY.test(l)) ?? v).join(", "),
  };
};

function parseEnum(field: ImportField, raw: unknown): ParsedValue {
  const value = matchEnum(field, String(raw));

  return value ? { value } : { issue: detail("enumUnknown", { got: String(raw), ...enumHint(field) }) };
}

export function splitList(s: string): string[] {
  const sep = s.includes("|") ? "|" : s.includes(";") ? ";" : ",";

  return s.split(sep).map((x) => x.trim()).filter(Boolean);
}

export const joinList = (items: readonly string[]) => (items.some((i) => i.includes(",")) ? items.join(" | ") : items.join(", "));

function parseList(field: ImportField, raw: unknown): ParsedValue {
  const items = Array.isArray(raw) ? raw.map((x) => String(x).trim()).filter(Boolean) : splitList(String(raw));

  if (!field.enumValues) return { value: items };

  const out: string[] = [];

  const bad: string[] = [];

  for (const item of items) {
    const v = matchEnum(field, item);

    if (v) out.push(v);
    else bad.push(item);
  }

  return bad.length > 0 ? { issue: detail("listUnknown", { got: bad.join(", "), ...enumHint(field) }) } : { value: out };
}

const DICE = /^\d*d\d+([+-]\d+)?$/;

function parseDice(raw: unknown): ParsedValue {
  if (typeof raw === "number") return Number.isInteger(raw) && raw >= 0 ? { value: raw } : { issue: detail("diceCount") };

  const s = normalizeDiceText(String(raw));

  if (/^\d+$/.test(s)) return { value: Number(s) };

  return DICE.test(s) ? { value: s } : { issue: detail("diceExpected", { got: String(raw) }) };
}

function parseCr(raw: unknown): ParsedValue {
  let n: number;

  if (typeof raw === "number") n = raw;
  else {
    const m = /^\s*(?:cr\s*)?(?:(\d+)\s*\/\s*(\d+)|\d+(?:[.,]\d+)?)(?![.\-/]?[\p{L}\d])/iu.exec(String(raw));

    n = !m ? NaN : m[2] ? Number(m[1]) / Number(m[2]) : Number(m[0].replace(/^\s*cr\s*/i, "").replace(",", "."));
  }

  return Number.isFinite(n) && isChallengeRating(n) ? { value: n } : { issue: detail("crExpected", { got: String(raw) }) };
}

function parseJsonCell(raw: unknown): ParsedValue {
  if (typeof raw !== "string") return { value: raw };

  try {
    return { value: JSON.parse(raw) };
  } catch {
    return { issue: detail("jsonInvalid") };
  }
}

function parseAttackText(raw: string): ParsedValue {
  const { attacks, unparsed } = parseAttacksDetailed(raw);

  return unparsed.length > 0 ? { value: attacks, warning: detail("attackUnparsed", { attacks: unparsed.map((u) => u.slice(0, 40)).join(" | ") }) } : { value: attacks };
}

const looksJson = (s: string) => /^\s*[[{]/.test(s);

export function parseFieldValue(field: ImportField, rawCell: unknown): ParsedValue {
  if (isEmptyValue(rawCell)) return {};

  const raw = typeof rawCell === "string" ? unguardFormula(rawCell) : rawCell;

  if (typeof raw === "string" && field.type !== "string" && field.type !== "bool" && EMPTY_MARK.test(raw.trim())) return {};

  switch (field.type) {
    case "string":
    case "ref":
      return { value: String(raw).trim() };
    case "int":
      return parseInteger(field, raw);
    case "number":
      return parseDecimal(raw);
    case "bool":
      return parseBoolean(raw);
    case "enum":
      return parseEnum(field, raw);
    case "list":
    case "refList":
      return parseList(field, raw);
    case "dice":
      return parseDice(raw);
    case "cr":
      return parseCr(raw);
    case "json":
      return parseJsonCell(raw);
    case "attacks":
      return typeof raw === "string" && !looksJson(raw) ? parseAttackText(raw) : parseJsonCell(raw);
    case "abilitiesText":
      return typeof raw === "string" && !looksJson(raw) ? { value: specialAbilitiesToAbilities(parseSpecialAbilities(raw)) } : parseJsonCell(raw);
  }
}

function namesInside(value: unknown, nested: NonNullable<ImportField["nestedRef"]>, nameOf: (kind: ImportKind, id: string) => string | undefined): unknown {
  if (Array.isArray(value)) return value.map((v) => namesInside(v, nested, nameOf));

  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === nested.key && typeof v === "string" ? (nameOf(nested.kind, v) ?? v) : namesInside(v, nested, nameOf)]));
}

export function formatFieldValue(field: ImportField, value: unknown, nameOf: (kind: ImportKind, id: string) => string | undefined, locale: Locale = DEFAULT_LOCALE): string {
  if (value === undefined || value === null) return "";

  const nameFor = (id: unknown) => (field.ref && nameOf(field.ref, String(id))) || String(id);

  switch (field.type) {
    case "ref":
      return nameFor(value);
    case "refList":
      return Array.isArray(value) ? joinList(value.map(nameFor)) : "";
    case "list":
      return Array.isArray(value) ? joinList(value.map(String)) : String(value);
    case "bool":
      return value ? BOOLEAN_WORDS[locale].yes : BOOLEAN_WORDS[locale].no;
    case "cr":
      return String(value);
    case "abilitiesText":
    case "json": {
      const mapped = field.nestedRef ? namesInside(value, field.nestedRef, nameOf) : value;

      return Array.isArray(mapped) && mapped.length === 0 ? "" : JSON.stringify(mapped);
    }
    case "attacks":
      return Array.isArray(value) && value.length === 0 ? "" : JSON.stringify(value);
    default:
      return String(value);
  }
}
