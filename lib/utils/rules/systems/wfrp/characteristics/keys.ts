export const CHARACTERISTIC_KEYS = ["ws", "bs", "s", "t", "i", "ag", "dex", "int", "wp", "fel"] as const;

export type CharacteristicKey = (typeof CHARACTERISTIC_KEYS)[number];

export const SKILL_KEY_RE = /^[a-z][a-z0-9-]{0,39}$/;

export const SPEC_RE = /^[a-z0-9-]{1,40}$/;

export const SKILL_ADVANCE_KEY_RE = /^[a-z][a-z0-9-]{0,39}(:[a-z0-9-]{1,40})?$/;

export type LedgerEntry = {
  id: string;
  at: string;
  kind: "characteristic" | "skill" | "talent";
  key: string;
  from: number;
  to: number;
  cost: number;
};

export const LEDGER_MAX = 200;

export type Characteristics = {
  base: Record<CharacteristicKey, number>;
  advances: Record<CharacteristicKey, number>;
  move: number;
  skillAdvances: Record<string, number>;
  fate: number;
  extraWounds: number;
  talents: Record<string, number>;
  ledger: LedgerEntry[];
  spentArchived: number;
};

const fill = (value: number) => Object.fromEntries(CHARACTERISTIC_KEYS.map((k) => [k, value])) as Record<CharacteristicKey, number>;

export const DEFAULT_CHARACTERISTICS: Characteristics = { base: fill(30), advances: fill(0), move: 4, skillAdvances: {}, fate: 0, extraWounds: 0, talents: {}, ledger: [], spentArchived: 0 };

const isInt = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

// Hand-written mirror of CharacteristicsSchema (schema.ts) so client bundles avoid zod.
function readPerKey(raw: unknown, min: number, max: number, base: number, fallback: Record<CharacteristicKey, number>) {
  if (raw === undefined) return fill(base);

  if (!isRecord(raw)) return fallback;

  const keys = Object.keys(raw);

  const valid = keys.every((k) => (CHARACTERISTIC_KEYS as readonly string[]).includes(k) && isInt(raw[k], min, max));

  return valid ? { ...fill(base), ...(raw as Partial<Record<CharacteristicKey, number>>) } : fallback;
}

function readSkillAdvances(raw: unknown) {
  if (raw === undefined) return {};

  if (!isRecord(raw)) return DEFAULT_CHARACTERISTICS.skillAdvances;

  const valid = Object.entries(raw).every(([k, v]) => SKILL_ADVANCE_KEY_RE.test(k) && isInt(v, 0, 100));

  return valid ? { ...(raw as Record<string, number>) } : DEFAULT_CHARACTERISTICS.skillAdvances;
}

function readTalents(raw: unknown) {
  if (raw === undefined) return {};

  if (!isRecord(raw)) return DEFAULT_CHARACTERISTICS.talents;

  const valid = Object.entries(raw).every(([k, v]) => k.length > 0 && isInt(v, 1, 20));

  return valid ? { ...(raw as Record<string, number>) } : DEFAULT_CHARACTERISTICS.talents;
}

const LEDGER_KINDS: readonly unknown[] = ["characteristic", "skill", "talent"];

const isLedgerEntry = (v: unknown): v is LedgerEntry =>
  isRecord(v) && typeof v.id === "string" && typeof v.at === "string" && LEDGER_KINDS.includes(v.kind) && typeof v.key === "string" && isInt(v.from, 0, 1e6) && isInt(v.to, 0, 1e6) && isInt(v.cost, 0, 1e9);

function readLedger(raw: unknown): LedgerEntry[] {
  if (!Array.isArray(raw) || raw.length > LEDGER_MAX || !raw.every(isLedgerEntry)) return DEFAULT_CHARACTERISTICS.ledger;

  return raw.map((e) => ({ id: e.id, at: e.at, kind: e.kind, key: e.key, from: e.from, to: e.to, cost: e.cost }));
}

export function readCharacteristics(row: { characteristics?: unknown }): Characteristics {
  const raw = row.characteristics ?? {};

  if (!isRecord(raw)) return DEFAULT_CHARACTERISTICS;

  const num = (key: "move" | "fate" | "extraWounds", min: number, max: number) => (raw[key] === undefined || !isInt(raw[key], min, max) ? DEFAULT_CHARACTERISTICS[key] : (raw[key] as number));

  return {
    base: readPerKey(raw.base, 1, 100, 30, DEFAULT_CHARACTERISTICS.base),
    advances: readPerKey(raw.advances, 0, 100, 0, DEFAULT_CHARACTERISTICS.advances),
    move: num("move", 1, 12),
    skillAdvances: readSkillAdvances(raw.skillAdvances),
    fate: num("fate", 0, 9),
    extraWounds: num("extraWounds", 0, 3),
    talents: readTalents(raw.talents),
    ledger: readLedger(raw.ledger),
    spentArchived: raw.spentArchived === undefined || !isInt(raw.spentArchived, 0, 1e9) ? 0 : raw.spentArchived,
  };
}
