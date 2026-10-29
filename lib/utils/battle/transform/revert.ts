import { CombatStatus } from "@/lib/constants/battle";
import { applyRawDamage } from "@/lib/utils/abilities/engine/effects/hp";
import { isZoneConcentrationLive } from "@/lib/utils/battle/concentration";
import { removeEffects } from "@/lib/utils/battle/conditions/query";
import { isFallen } from "@/lib/utils/battle/grid/occupancy";
import type { BattleParticipant, TransformState } from "@/types/battle";

export const transformKey = (castId: string) => `transform:${castId}`;

function restoreSaved(p: BattleParticipant, t: TransformState): BattleParticipant {
  const { saved } = t;

  const { transform: _transform, ...battleData } = p.battleData;

  const { movement, creatureType } = saved;

  const { creatureType: _type, ...abilities } = p.abilities;

  const stripped = removeEffects({ ...p, battleData }, (e) => e.abilityKey === transformKey(t.castId)).participant;

  return {
    ...stripped,
    abilities: {
      ...abilities,
      ...(creatureType && { creatureType }),
      strength: saved.strength,
      dexterity: saved.dexterity,
      constitution: saved.constitution,
      modifiers: { ...p.abilities.modifiers, ...saved.modifiers },
    },
    combatStats: { ...p.combatStats, maxHp: saved.maxHp, currentHp: saved.currentHp, tempHp: saved.tempHp, armorClass: saved.armorClass, speed: saved.speed, status: saved.status, ...(saved.gridSize !== undefined ? { gridSize: saved.gridSize } : {}) },
    battleData: { ...stripped.battleData, attacks: saved.attacks, ...(movement ? { movement } : { movement: undefined }) },
  };
}

/** Відкат на 0 HP форми: надлишок шкоди (понад HP форми) йде в звичайну форму. */
export function revertOnZero(before: BattleParticipant, after: BattleParticipant, amount: number): { before: BattleParticipant; after: BattleParticipant; overflow: number } | null {
  const t = before.battleData.transform ?? after.battleData.transform;

  if (!t || after.combatStats.currentHp > 0) return null;

  const overflow = Math.max(0, amount - before.combatStats.currentHp - before.combatStats.tempHp);

  const real = restoreSaved(after, t);

  return { before: real, after: applyRawDamage(real, overflow), overflow };
}

const expired = (p: BattleParticipant, round: number, ps: BattleParticipant[]) => {
  const t = p.battleData.transform;

  if (!t) return false;

  return (
    (t.expiresRound !== undefined && round > t.expiresRound) ||
    !isZoneConcentrationLive(ps, t.concentrationOf) ||
    !p.battleData.activeEffects.some((e) => e.abilityKey === transformKey(t.castId)) ||
    isFallen(p)
  );
};

/** Форма закінчилась (час, концентрація, знятий маркер, смерть): стани звичайної форми повертаються. */
export function revertExpiredTransforms(ps: BattleParticipant[], round: number): { participants: BattleParticipant[]; messages: string[] } {
  if (!ps.some((p) => expired(p, round, ps))) return { participants: ps, messages: [] };

  const messages: string[] = [];

  const participants = ps.map((p) => {
    if (!expired(p, round, ps)) return p;

    const t = p.battleData.transform as TransformState;

    const restored = restoreSaved(p, t);

    messages.push(`🐾 ${p.basicInfo.name} повертає звичайну форму`);

    return p.combatStats.status === CombatStatus.DEAD ? { ...restored, combatStats: { ...restored.combatStats, currentHp: 0, status: CombatStatus.DEAD } } : restored;
  });

  return { participants, messages };
}
