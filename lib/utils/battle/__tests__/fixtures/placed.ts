import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleAttack, BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

export const CLAWS: BattleAttack = { id: "c", name: "Пазурі", type: AttackType.MELEE, attackBonus: 8, damageDice: "2d6+6", damageType: "slashing" };

export const testMap = (cols = 10, rows = cols, extra: Partial<BattleMapConfig> = {}): BattleMapConfig => ({ cols, rows, background: null, opacity: 0.4, ...extra });

interface PlacedOptions {
  side?: ParticipantSide;
  at?: GridPoint;
  size?: number;
  hp?: number;
  abilities?: ResolvedAbility[];
  attacks?: BattleAttack[];
}

export function placed(id: string, opts: PlacedOptions = {}): BattleParticipant {
  const p = makeParticipant({ id, side: opts.side ?? ParticipantSide.ENEMY, hp: opts.hp ?? 200, maxHp: opts.hp ?? 200, abilities: opts.abilities });

  return {
    ...p,
    combatStats: { ...p.combatStats, ...(opts.size && { gridSize: opts.size }) },
    battleData: { ...p.battleData, attacks: opts.attacks ?? [CLAWS], ...(opts.at && { position: opts.at }) },
  };
}

export const hpOf = (ps: BattleParticipant[], id: string) => ps.find((p) => p.basicInfo.id === id)?.combatStats.currentHp;

export const byId = (ps: BattleParticipant[], id: string) => ps.find((p) => p.basicInfo.id === id) as BattleParticipant;
