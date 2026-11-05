import { CHARACTERISTIC_KEYS, type CharacteristicKey, type Characteristics, LEDGER_MAX, type LedgerEntry, SKILL_ADVANCE_KEY_RE } from "../characteristics/keys";
import { advanceCost, talentCost } from "./cost";
import type { AdvancementRules } from "./rules";

export type PurchaseRequest = { kind: "characteristic" | "skill" | "talent"; key: string };

export type PurchaseError = "INSUFFICIENT_XP" | "AT_LIMIT" | "MAX_RANK" | "UNKNOWN_KEY" | "UNKNOWN_TALENT" | "TALENT_NO_COST";

export type PurchaseTalent = { id: string; xpCost: number | null; maxRank: number | null };

export type PurchaseInput = {
  characteristics: Characteristics;
  available: number;
  request: PurchaseRequest;
  rules: AdvancementRules;
  talent?: PurchaseTalent;
  now: string;
  id: string;
};

export type PurchaseResult = { ok: true; next: Characteristics; entry: LedgerEntry } | { ok: false; error: PurchaseError };

const isCharacteristicKey = (key: string): key is CharacteristicKey => (CHARACTERISTIC_KEYS as readonly string[]).includes(key);

type Priced = { from: number; cost: number; apply: (c: Characteristics) => Characteristics } | { error: PurchaseError };

function priceCharacteristic(c: Characteristics, key: string, rules: AdvancementRules): Priced {
  if (!isCharacteristicKey(key)) return { error: "UNKNOWN_KEY" };

  const from = c.advances[key];

  const cost = advanceCost("characteristic", from, rules);

  if (cost === null) return { error: "AT_LIMIT" };

  return { from, cost, apply: (cur) => ({ ...cur, advances: { ...cur.advances, [key]: from + 1 } }) };
}

function priceSkill(c: Characteristics, key: string, rules: AdvancementRules): Priced {
  if (!SKILL_ADVANCE_KEY_RE.test(key)) return { error: "UNKNOWN_KEY" };

  const from = c.skillAdvances[key] ?? 0;

  const cost = advanceCost("skill", from, rules);

  if (cost === null) return { error: "AT_LIMIT" };

  return { from, cost, apply: (cur) => ({ ...cur, skillAdvances: { ...cur.skillAdvances, [key]: from + 1 } }) };
}

function priceTalent(c: Characteristics, key: string, talent: PurchaseTalent | undefined, rules: AdvancementRules): Priced {
  if (!talent || talent.id !== key) return { error: "UNKNOWN_TALENT" };

  if (talent.xpCost === null) return { error: "TALENT_NO_COST" };

  const from = c.talents[key] ?? 0;

  if (from >= (talent.maxRank ?? 1)) return { error: "MAX_RANK" };

  return { from, cost: talentCost(talent.xpCost, from, rules), apply: (cur) => ({ ...cur, talents: { ...cur.talents, [key]: from + 1 } }) };
}

export function planPurchase(input: PurchaseInput): PurchaseResult {
  const { characteristics, request, rules } = input;

  const priced = request.kind === "characteristic" ? priceCharacteristic(characteristics, request.key, rules) : request.kind === "skill" ? priceSkill(characteristics, request.key, rules) : priceTalent(characteristics, request.key, input.talent, rules);

  if ("error" in priced) return { ok: false, error: priced.error };

  if (input.available < priced.cost) return { ok: false, error: "INSUFFICIENT_XP" };

  const entry: LedgerEntry = { id: input.id, at: input.now, kind: request.kind, key: request.key, from: priced.from, to: priced.from + 1, cost: priced.cost };

  const advanced = priced.apply(characteristics);

  return { ok: true, next: { ...advanced, ledger: [...advanced.ledger, entry].slice(-LEDGER_MAX) }, entry };
}
