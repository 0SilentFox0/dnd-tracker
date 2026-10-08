import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { buildPartyPower, computeFairScaling, heroMember, type Power, unitMember } from "@/lib/utils/battle/balance";
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

  const members: Parameters<typeof buildPartyPower>[0] = [];

  const fixed: Power = { hp: 0, dpr: 0 };

  const roster = new Map<string, number>();

  slots.forEach((slot, i) => {
    if (isEnemyUnit(slot) && slot.type === ParticipantSourceType.UNIT) {
      roster.set(slot.unit.id, (roster.get(slot.unit.id) ?? 0) + 1);

      return;
    }

    if (slot.side !== ParticipantSide.ALLY) {
      if (slot.type === ParticipantSourceType.CHARACTER) {
        const { dpr, hp } = heroPower(built[i], slot.character, campaignContext).stats;

        fixed.dpr += dpr;
        fixed.hp += hp;
      }

      return;
    }

    if (slot.type === ParticipantSourceType.CHARACTER) {
      members.push({ stats: heroMember(heroPower(built[i], slot.character, campaignContext).stats), hero: true });

      return;
    }

    const unit = byId.get(slot.unit.id);

    if (unit) members.push({ stats: unitMember(unit), hero: false });
  });

  const party = buildPartyPower(members);

  const scaling = computeFairScaling(party, [...roster].map(([unitId, quantity]) => ({ unitId, quantity })), library, library, fixed);

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
