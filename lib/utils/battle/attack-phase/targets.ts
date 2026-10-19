import { AttackType } from "@/lib/constants/battle";
import type { findFlagsMany } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { isTargetable } from "@/lib/utils/abilities/engine/core/participants";
import { piercingTargets } from "@/lib/utils/battle/attack/process/piercing";
import { enemiesInReach } from "@/lib/utils/battle/grid";
import { BattleRuleError } from "@/lib/utils/battle/store/errors";
import type { BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";

type AttackFlags = ReturnType<typeof findFlagsMany<"attackHitsAllEnemies" | "piercingShot" | "multiTargetFalloff">>;

export interface AttackTargetsInput {
  order: BattleParticipant[];
  attacker: BattleParticipant;
  attack: BattleAttack;
  chosen: BattleParticipant[];
  targetIds: string[];
  map?: BattleMapConfig | null;
  flags: AttackFlags;
}

export interface AttackTargets {
  targets: BattleParticipant[];
  expanded: boolean;
  isMultiTargetRanged: boolean;
  falloff: number;
}

const enemyOf = (attacker: BattleParticipant) => (t: BattleParticipant) => t.basicInfo.side !== attacker.basicInfo.side && isTargetable(t);

export function resolveAttackTargets({ order, attacker, attack, chosen, targetIds, map, flags }: AttackTargetsInput): AttackTargets {
  const isAoe = attack.targetType === "aoe";

  const hitsAllEnemies = flags.attackHitsAllEnemies.length > 0;

  const piercing = !hitsAllEnemies && !isAoe && attack.type === AttackType.RANGED && !!map && flags.piercingShot.length > 0;

  const expanded = hitsAllEnemies || piercing;

  const byId = (ids: string[]) => ids.flatMap((id) => order.find((p) => p.basicInfo.id === id) ?? []);

  const reachable = (): BattleParticipant[] => (map && attacker.battleData.position ? enemiesInReach(map, order, attacker, attack) : order.filter(enemyOf(attacker)));

  const targets = hitsAllEnemies
    ? [...chosen.filter(enemyOf(attacker)), ...reachable().filter((t) => !targetIds.includes(t.basicInfo.id))]
    : piercing
      ? byId([...new Set([...piercingTargets(map, order, attacker, chosen[0].basicInfo.id), ...targetIds])])
      : chosen;

  if (targets.length === 0) throw new BattleRuleError("action_rejected", "Жоден ворог не в досяжності");

  const isMultiTargetRanged = expanded || (!isAoe && attack.type === AttackType.RANGED && (attacker.combatStats.maxTargets ?? 1) > 1);

  const maxPossibleTargets = expanded ? targets.length : isAoe ? attack.maxTargets || attacker.combatStats.maxTargets || 1 : isMultiTargetRanged ? attacker.combatStats.maxTargets || 1 : 1;

  if (targets.length > maxPossibleTargets) throw new BattleRuleError("action_rejected", `Забагато цілей. Максимум: ${maxPossibleTargets}`);

  const falloffPercents = expanded ? [] : flags.multiTargetFalloff.map((f) => f.percent);

  return { targets, expanded, isMultiTargetRanged, falloff: falloffPercents.length > 0 ? Math.min(...falloffPercents) / 100 : 1 };
}
