import { renderEntries } from "../entries";
import { array, str } from "./shared";

import { type AbilityKey } from "@/lib/constants/abilities";
import { proficiencyForChallenge } from "@/lib/constants/challenge";
import type { WeaponTrait } from "@/lib/constants/weapon-traits";
import { parseDice } from "@/lib/utils/common/dice";
import { engineAttackMod, multiattackCount, residualAttackBonus, withFlat } from "@/lib/utils/units/monster-attacks";

export interface MonsterStats { scores: Partial<Record<AbilityKey, number>> | null; cr: number | null }

export interface ParsedAttack { row: Record<string, unknown>; rider: boolean; mixedDamage: boolean }

const TYPES = "acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder";

const HEAD = /^(?:\{@atk ([a-z,]+)\}\s*)?\{@hit (-?\d+)\}\s+to hit,\s*([^{}]*?)\{@h\}/i;

const DAMAGE = new RegExp(`^(?:(?:\\d+\\s*\\()?\\{@(?:damage|dice) ([^}]+)\\}\\)?|(\\d+))\\s+(${TYPES})\\s+damage`, "i");

const EXTRA = /^,?\s*(?:plus|and)\s+(?:an extra\s+)?/i;

const COUNT_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };

export const plainName = (name: string): string => name.replace(/\s*\{@recharge[^}]*\}/gi, "").replace(/\s*\{@[a-z]+ ([^|}]*)[^}]*\}/gi, " $1").replace(/\s+/g, " ").trim();

function rechargeNote(name: string): string | undefined {
  const m = /\{@recharge(?: (\d))?\}/i.exec(name);

  return m ? `Recharge ${m[1] ?? 6}-6` : undefined;
}

export function parseAttack(action: { name: string; entries: unknown[] }, monster: MonsterStats): ParsedAttack | undefined {
  const [first, ...more] = action.entries;

  const text = typeof first === "string" ? first.trim() : "";

  const head = HEAD.exec(text);

  if (!head) return;

  const [matched, tag, hit, mid] = head;

  const reachText = /reach (\d+)\s*ft/i.exec(mid)?.[1];

  const reach = reachText === undefined ? undefined : Number(reachText);

  const range = /range (\d+)(?:\/(\d+))?\s*ft/i.exec(mid);

  const melee = tag ? /^m/i.test(tag) : reach !== undefined;

  if (reach === undefined && !range) return;

  let tail = text.slice(matched.length);

  const groups: string[] = [];

  let flat = 0;

  const types: string[] = [];

  const extras: string[] = [];

  for (let n = 0; n < 4; n++) {
    const connector = n === 0 ? "" : (EXTRA.exec(tail)?.[0] ?? null);

    if (connector === null) break;

    const m = DAMAGE.exec(tail.slice(connector.length));

    if (!m) break;

    const parsed = m[1] ? parseDice(m[1]) : null;

    if (m[1] && !parsed) return;

    groups.push(...(parsed?.groups.map((g) => `${g.count}d${g.size}`) ?? []));

    flat += parsed?.flat ?? Number(m[2]);

    types.push(m[3].toLowerCase());

    if (n > 0) extras.push(`${m[1] ?? m[2]} ${m[3].toLowerCase()}`);

    tail = tail.slice(connector.length + m[0].length);
  }

  if (types.length === 0) return;

  const { scores, cr } = monster;

  const adjust = cr !== null && scores !== null;

  const finesse = adjust && melee && !tag?.includes("s") && (engineAttackMod(scores, "melee", true) > engineAttackMod(scores, "melee", false)) && Number(hit) - proficiencyForChallenge(cr) === engineAttackMod(scores, "melee", true);

  const kind = melee ? "melee" : "ranged";

  const mod = adjust ? engineAttackMod(scores, kind, finesse) : 0;

  const thrown = melee && !!range;

  const traits: WeaponTrait[] = [...(finesse ? (["finesse"] as const) : []), ...((reach ?? 0) >= 10 ? (["reach"] as const) : []), ...(thrown ? (["thrown"] as const) : [])];

  const targets = COUNT_WORDS[/\b(one|two|three|four|five) (?:target|creature)s?\b/i.exec(mid)?.[1].toLowerCase() ?? ""] ?? 1;

  const riderText = renderEntries([tail.replace(/^[\s.,;)]+/, ""), ...more]).text.trim();

  const properties = [rechargeNote(action.name), extras.length > 0 ? `plus ${extras.join(" plus ")} (included in damage dice)` : undefined, reach && reach > 10 ? `reach ${reach} ft.` : undefined, riderText || undefined].filter(Boolean).join("; ");

  const dice = groups.join("+");

  const residual = flat - mod;

  const row: Record<string, unknown> = {
    name: plainName(action.name),
    type: kind,
    attackBonus: adjust ? residualAttackBonus(Number(hit), mod, cr) : Number(hit),
    damageDice: dice ? withFlat(dice, residual) : String(residual),
    damageType: types[0],
    ...(range && { range: range[2] ? `${range[1]}/${range[2]}` : range[1] }),
    ...(targets > 1 && { maxTargets: targets }),
    ...(traits.length > 0 && { traits }),
    ...(properties && { properties }),
  };

  return { row, rider: riderText.length > 0, mixedDamage: new Set(types).size > 1 };
}

export interface Multiattack { count: number; complex: boolean }

export function parseMultiattack(action: { name: string; entries: unknown[] }): Multiattack | undefined {
  if (action.name.trim().toLowerCase() !== "multiattack") return;

  const text = array(action.entries).filter((e): e is string => typeof e === "string").join(" ");

  if (!/\battacks?\b/i.test(text)) return;

  return { count: multiattackCount(text), complex: /\b(or|alternatively|uses?)\b/i.test(text) };
}

export const spellRefs = (text: string): Array<{ name: string; source: string }> => [...text.matchAll(/\{@spell ([^|}]+)(?:\|([^|}]*))?[^}]*\}/g)].map((m) => ({ name: m[1].trim(), source: str(m[2]).trim() }));
