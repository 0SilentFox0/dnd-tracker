import { dive, fireBurst, squall } from "@/data/library/unit-abilities";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { resolveAmount } from "@/lib/utils/abilities/engine/core/amount";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleAttack, BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

export const MAP: BattleMapConfig = { cols: 20, rows: 20, background: null, opacity: 0.4 };

export const CLAWS: BattleAttack = { id: "c", name: "Пазурі", type: AttackType.MELEE, attackBonus: 8, damageDice: "2d6+6", damageType: "slashing" };

export const ABILITIES = { dive: resolved(dive(), { type: "unit", id: "g" }), squall: resolved(squall(), { type: "unit", id: "g" }), fireBurst: resolved(fireBurst(), { type: "unit", id: "g" }) };

export function unit(id: string, opts: { side?: ParticipantSide; at?: GridPoint; size?: number; hp?: number; abilities?: ResolvedAbility[] } = {}): BattleParticipant {
  const p = makeParticipant({ id, side: opts.side ?? ParticipantSide.ENEMY, hp: opts.hp ?? 200, maxHp: opts.hp ?? 200, abilities: opts.abilities });

  return {
    ...p,
    combatStats: { ...p.combatStats, ...(opts.size && { gridSize: opts.size }) },
    battleData: { ...p.battleData, attacks: [CLAWS], ...(opts.at && { position: opts.at }) },
  };
}

export const griffin = (ability: keyof typeof ABILITIES, at?: GridPoint) => unit("g", { side: ParticipantSide.ALLY, at, abilities: [ABILITIES[ability]] });

export const percentOfAttack = (owner: BattleParticipant, value: number) => resolveAmount({ percentOf: "ownerAttack", value }, { owner, rng: () => 0, participants: [owner] });

export const hp = (ps: BattleParticipant[], id: string) => ps.find((p) => p.basicInfo.id === id)?.combatStats.currentHp;

export const byId = (ps: BattleParticipant[], id: string) => ps.find((p) => p.basicInfo.id === id) as BattleParticipant;

export function perform(ps: BattleParticipant[], ability: keyof typeof ABILITIES, opts: { targetIds?: string[]; targetCell?: GridPoint; map?: BattleMapConfig; rng?: Rng; round?: number } = {}) {
  return runAbilities(
    ps,
    { type: "action", actorId: "g", abilityKey: ABILITIES[ability].key, targetIds: opts.targetIds ?? [], ...(opts.targetCell && { targetCell: opts.targetCell }) },
    { round: opts.round ?? 1, rng: opts.rng ?? (() => 0), ...(opts.map && { map: opts.map }) },
  );
}
