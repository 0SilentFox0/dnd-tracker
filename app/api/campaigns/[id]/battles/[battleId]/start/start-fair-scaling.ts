import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { computeFairScaling, type PartyPower } from "@/lib/utils/battle/balance";
import { heroPower } from "@/lib/utils/battle/balance/hero-power";
import { loadUnitLibraryStats } from "@/lib/utils/battle/balance/unit-library";
import type { CampaignSpellContext } from "@/lib/utils/battle/types/participant";
import type { BattleParticipant } from "@/types/battle";

export type StartSlot =
  | { type: typeof ParticipantSourceType.CHARACTER; character: { race: string; skillTreeProgress?: unknown }; side: ParticipantSide }
  | { type: typeof ParticipantSourceType.UNIT; unit: { id: string }; side: ParticipantSide };

/** Enemy units get HP and damage multipliers from the final roster; heroes and later summons stay as built. */
export async function scaleEnemiesForFairBattle(campaignId: string, slots: StartSlot[], built: BattleParticipant[], campaignContext: CampaignSpellContext | undefined): Promise<BattleParticipant[]> {
  const isEnemyUnit = (s: StartSlot) => s.type === ParticipantSourceType.UNIT && s.side === ParticipantSide.ENEMY;

  if (!slots.some(isEnemyUnit)) return built;

  const library = await loadUnitLibraryStats(campaignId);

  const byId = new Map(library.map((u) => [u.unitId, u]));

  const party: PartyPower = { dpr: 0, hp: 0, heroCount: 0 };

  const roster = new Map<string, number>();

  slots.forEach((slot, i) => {
    if (isEnemyUnit(slot) && slot.type === ParticipantSourceType.UNIT) {
      roster.set(slot.unit.id, (roster.get(slot.unit.id) ?? 0) + 1);

      return;
    }

    if (slot.side !== ParticipantSide.ALLY) return;

    const stats = slot.type === ParticipantSourceType.CHARACTER ? heroPower(built[i], slot.character, campaignContext).stats : byId.get(slot.unit.id);

    if (stats) {
      party.dpr += stats.dpr;
      party.hp += "hp" in stats ? stats.hp : 0;
      if (slot.type === ParticipantSourceType.CHARACTER) party.heroCount += 1;
    }
  });

  const scaling = computeFairScaling(party, [...roster].map(([unitId, quantity]) => ({ unitId, quantity })), library);

  if (scaling.verdict === "empty") return built;

  return built.map((p, i) => {
    const slot = slots[i];

    const scale = isEnemyUnit(slot) && slot.type === ParticipantSourceType.UNIT ? scaling.units[slot.unit.id] : undefined;

    if (!scale) return p;

    const maxHp = Math.max(1, Math.round(p.combatStats.maxHp * scale.hpMult));

    return {
      ...p,
      combatStats: { ...p.combatStats, maxHp, currentHp: maxHp },
      battleData: { ...p.battleData, hpMultiplier: scale.hpMult, damageMultiplier: scale.dmgMult },
    };
  });
}
