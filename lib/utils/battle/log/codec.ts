import type { LogLine, TextArg, TextRef } from "@/types/text";

/** Stored shape of `details.log` lines: `{ message, params }` becomes `{ m, p }`. Tables are append-only — stored rows depend on them. */
type StoredRef = { m: string; p?: Record<string, StoredArg> };

type StoredArg = string | number | StoredRef;

const PREFIXES: ReadonlyArray<readonly [code: string, prefix: string]> = [
  ["a", "abilityText.log."],
  ["k", "battleLog.attack."],
  ["u", "battleLog.turn."],
  ["m", "battleLog.morale."],
  ["g", "battleLog.triggers."],
  ["o", "battleLog.offTurn."],
  ["s", "battleActions.spell."],
  ["c", "battleTerms.crits."],
  ["r", "battleLog.roll."],
  ["l", "battleLog.spell."],
  ["p", "abilityRegistry.options."],
  ["x", "battleLog.aura."],
  ["b", "battleLog."],
  ["j", "$join"],
  ["z", "$capitalize"],
];

const PARAM_KEYS: ReadonlyArray<readonly [code: string, key: string]> = [
  ["t", "target"],
  ["a", "ability"],
  ["n", "name"],
  ["d", "damage"],
  ["e", "effect"],
  ["r", "rounds"],
  ["k", "attacker"],
  ["l", "roll"],
  ["u", "amount"],
  ["y", "type"],
  ["s", "names"],
  ["m", "morale"],
  ["h", "threshold"],
  ["i", "detail"],
  ["f", "flavor"],
  ["c", "count"],
  ["w", "hasCount"],
  ["g", "guardian"],
  ["p", "spell"],
  ["q", "d20"],
  ["o", "title"],
  ["x", "chance"],
  ["b", "label"],
  ["v", "heal"],
];

const SEPARATOR = "|";

const prefixByCode = new Map(PREFIXES);

const codeByKey = new Map(PARAM_KEYS.map(([code, key]) => [key, code]));

const keyByCode = new Map(PARAM_KEYS);

const isRef = (value: unknown): value is TextRef => typeof value === "object" && value !== null && typeof (value as TextRef).message === "string";

const isStored = (value: unknown): value is StoredRef => typeof value === "object" && value !== null && typeof (value as StoredRef).m === "string";

function encodeMessage(message: string): string {
  const hit = PREFIXES.find(([, prefix]) => message.startsWith(prefix));

  return hit ? `${hit[0]}${SEPARATOR}${message.slice(hit[1].length)}` : message;
}

function decodeMessage(message: string): string {
  const at = message.indexOf(SEPARATOR);

  const prefix = at > 0 ? prefixByCode.get(message.slice(0, at)) : undefined;

  return prefix === undefined ? message : `${prefix}${message.slice(at + 1)}`;
}

function encodeArg(arg: TextArg): StoredArg {
  return isRef(arg) ? encodeRef(arg) : arg;
}

function encodeRef(ref: TextRef): StoredRef {
  const entries = Object.entries(ref.params ?? {});

  if (entries.some(([key]) => keyByCode.has(key)) || ref.message.includes(SEPARATOR)) return ref as unknown as StoredRef;

  const m = encodeMessage(ref.message);

  return entries.length ? { m, p: Object.fromEntries(entries.map(([key, value]) => [codeByKey.get(key) ?? key, encodeArg(value)])) } : { m };
}

function decodeArg(arg: StoredArg | TextRef): TextArg {
  return typeof arg === "object" ? decodeRef(arg) : arg;
}

function decodeRef(ref: StoredRef | TextRef): TextRef {
  if (!isStored(ref)) return ref as TextRef;

  const message = decodeMessage(ref.m);

  if (!ref.p) return { message };

  return { message, params: Object.fromEntries(Object.entries(ref.p).map(([key, value]) => [keyByCode.get(key) ?? key, decodeArg(value)])) };
}

export const encodeLog = (log: readonly LogLine[]): LogLine[] => log.map((line) => (typeof line === "string" ? line : (encodeRef(line) as unknown as TextRef)));

/** Accepts both stored shapes: `{ m, p }` and legacy `{ message, params }`. */
export const decodeLog = (log: readonly LogLine[]): LogLine[] => log.map((line) => (typeof line === "string" ? line : decodeRef(line)));

export function decodeStoredLog(details: unknown): LogLine[] | undefined {
  const log = (details as { log?: LogLine[] } | null | undefined)?.log;

  return log && decodeLog(log);
}
