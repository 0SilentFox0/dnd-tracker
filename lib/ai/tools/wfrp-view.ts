import { CHARACTERISTIC_KEYS, type CharacteristicKey, type Characteristics, characteristicValue, readCharacteristics, woundsMax } from "@/lib/utils/rules/systems";
import type { BattleParticipant } from "@/types/battle";

export type WfrpCareerRef = { id: string; name: string; tiers: unknown };

export type WfrpHeroView = { characteristics: Record<CharacteristicKey, number>; woundsMax: number; fate: number; career: { name: string; tier: number; tierName: string | null } | null };

export const WFRP_SYSTEM_LINE = "Rule system: Grim d100 (percentile). Tests roll d100 against a characteristic; success levels (SL) measure the margin. Heroes have Wounds instead of hit points, Fate/Fortune points and careers with tiers; battles track Momentum. There is no AC and no ability scores.";

export const characteristicValues = (c: Characteristics): Record<CharacteristicKey, number> => Object.fromEntries(CHARACTERISTIC_KEYS.map((k) => [k, characteristicValue(c, k)])) as Record<CharacteristicKey, number>;

function tierName(tiers: unknown, tier: number): string | null {
  const entry = Array.isArray(tiers) ? (tiers[tier - 1] as { name?: unknown } | undefined) : undefined;

  return typeof entry?.name === "string" ? entry.name : null;
}

export function wfrpHeroView(row: { characteristics?: unknown }, careers: readonly WfrpCareerRef[]): WfrpHeroView {
  const c = readCharacteristics(row);

  const ref = c.career ? careers.find((x) => x.id === c.career?.careerId) : undefined;

  return {
    characteristics: characteristicValues(c),
    woundsMax: woundsMax(c),
    fate: c.fate,
    career: c.career && ref ? { name: ref.name, tier: c.career.tier, tierName: tierName(ref.tiers, c.career.tier) } : null,
  };
}

export function wfrpParticipantView(p: BattleParticipant) {
  const { characteristics } = p.abilities;

  return {
    name: p.basicInfo.name,
    side: p.basicInfo.side,
    wounds: `${p.combatStats.currentHp}/${p.combatStats.maxHp}`,
    status: p.combatStats.status,
    ...(characteristics && { characteristics: characteristicValues(characteristics) }),
  };
}
