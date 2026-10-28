import { AttackType } from "@/lib/constants/battle";
import type { findFlagsMany } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant, isAttackable } from "@/lib/utils/abilities/engine/core/participants";
import { attackMaxTargets, isCleave } from "@/lib/utils/battle/attack/max-targets";
import { cleaveTargets } from "@/lib/utils/battle/attack/process/cleave";
import { piercingTargets } from "@/lib/utils/battle/attack/process/piercing";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { enemiesInReach } from "@/lib/utils/battle/grid";
import { BattleRuleError } from "@/lib/utils/battle/store/errors";
import type { BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";

type AttackFlags = ReturnType<typeof findFlagsMany<"attackHitsAllEnemies" | "piercingShot" | "multiTargetFalloff" | "chainShot">>;

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
  piercing: boolean;
  /** Кожна ціль — окремий удар з власними кубиками; основна — повна шкода, решта — за falloff. */
  volley: boolean;
  falloff: number;
  /** З цього індексу d20 і кубики шкоди кидає сервер (автоцілі розщеплення). */
  serverRolledFrom: number;
  /** `percent` — частка шкоди попереднього пострілу на кожен стрибок. */
  chain: { jumps: number; percent: number } | null;
}

const enemyOf = (attacker: BattleParticipant) => (t: BattleParticipant) => t.basicInfo.side !== attacker.basicInfo.side && isAttackable(t);

export function resolveAttackTargets({ order, attacker, attack, chosen, targetIds, map, flags }: AttackTargetsInput): AttackTargets {
  const isAoe = attack.targetType === "aoe";

  const isRanged = attackKindOf(attack.type) === AttackType.RANGED;

  const hitsAllEnemies = flags.attackHitsAllEnemies.length > 0;

  const piercing = !hitsAllEnemies && !isAoe && isRanged && !!map && flags.piercingShot.length > 0;

  const expanded = hitsAllEnemies || piercing;

  const onMap = !!map && !!attacker.battleData.position;

  const cleave = !expanded && isCleave(attack) && onMap;

  const byId = (ids: string[]) => ids.flatMap((id) => findParticipant(order, id) ?? []);

  const reachable = (): BattleParticipant[] => (onMap ? enemiesInReach(map, order, attacker, attack) : order.filter(enemyOf(attacker)));

  const isChain = !expanded && isRanged && !isAoe && flags.chainShot.length > 0;

  const limit = attackMaxTargets(attacker, attack, { chain: isChain, onMap });

  if (!expanded && chosen.length > limit) throw new BattleRuleError("action_rejected", `Забагато цілей. Максимум: ${limit}`);

  const targets = hitsAllEnemies
    ? [...chosen.filter(enemyOf(attacker)), ...reachable().filter((t) => !targetIds.includes(t.basicInfo.id))]
    : piercing
      ? byId([...new Set([...piercingTargets(map, order, attacker, chosen[0].basicInfo.id), ...targetIds])])
      : cleave
        ? [chosen[0], ...cleaveTargets(map, order, attacker, chosen[0], (attack.maxTargets ?? 1) - 1)]
        : chosen;

  if (targets.length === 0) throw new BattleRuleError("action_rejected", "Жоден ворог не в досяжності");

  const volley = !isChain && (expanded || cleave || (!isAoe && (isRanged || isCleave(attack)) && limit > 1));

  const falloffPercents = expanded ? [] : flags.multiTargetFalloff.map((f) => f.percent);

  return {
    targets,
    expanded,
    piercing,
    volley,
    falloff: falloffPercents.length > 0 ? Math.min(...falloffPercents) / 100 : 1,
    serverRolledFrom: cleave ? 1 : targets.length,
    chain: isChain ? { jumps: Math.max(0, ...flags.chainShot.map((f) => f.jumps)), percent: (flags.chainShot[0]?.percent ?? 100) / 100 } : null,
  };
}
