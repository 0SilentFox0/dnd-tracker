import "server-only";
import { prisma } from "@/lib/db";
import type { SystemAi } from "@/lib/server/systems/types";
import { value as characteristicValue, woundsMax } from "@/systems/wfrp/rules/characteristics/derive";
import { CHARACTERISTIC_KEYS, type CharacteristicKey, type Characteristics, readCharacteristics } from "@/systems/wfrp/rules/characteristics/keys";
import { PARTICIPANT_SLOT } from "@/systems/wfrp/rules/slots";
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
  const characteristics = PARTICIPANT_SLOT.read(p.abilities.system)?.characteristics;

  return {
    name: p.basicInfo.name,
    side: p.basicInfo.side,
    wounds: `${p.combatStats.currentHp}/${p.combatStats.maxHp}`,
    status: p.combatStats.status,
    ...(characteristics && { characteristics: characteristicValues(characteristics) }),
  };
}

const WFRP_PARTY_SELECT = { id: true, name: true, level: true, race: true, notes: true, characteristics: true } as const;

const loadCareers = (campaignId: string): Promise<WfrpCareerRef[]> => prisma.career.findMany({ where: { campaignId }, select: { id: true, name: true, tiers: true } });

type HeroRow = { characteristics?: unknown } & Record<string, unknown>;

const heroView = async (campaignId: string, { characteristics, ...rest }: HeroRow) => ({ ...rest, ...wfrpHeroView({ characteristics }, await loadCareers(campaignId)) });

export const WFRP_AI: SystemAi = {
  promptLine: WFRP_SYSTEM_LINE,
  toolNotes: {
    get_party: "Grim d100 campaigns: race, career and tier, characteristics, Wounds and Fate instead of class and AC.",
    read_character: "Grim d100: characteristics, career, Wounds and Fate instead of ability scores and AC.",
    get_battle_state: "Grim d100 battles show Wounds and characteristics instead of HP/AC.",
  },
  heroSelect: WFRP_PARTY_SELECT,
  async party(campaignId, query) {
    const [rows, careers] = await Promise.all([prisma.character.findMany({ ...query, select: WFRP_PARTY_SELECT }), loadCareers(campaignId)]);

    return rows.map(({ characteristics, ...c }) => ({ ...c, ...wfrpHeroView({ characteristics }, careers) }));
  },
  hero: heroView,
  participantView: wfrpParticipantView,
  unitView: (u) => ({ characteristics: characteristicValues(readCharacteristics(u)) }),
};
