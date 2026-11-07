"use client";

import { useMemo } from "react";

import { useModeView } from "./modes/useModeView";
import { useBattleScene } from "./useBattleScene";

import { AttackType } from "@/lib/constants/battle";
import { isAirborne, isDying } from "@/lib/utils/abilities/engine/core/participants";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { attackReachError, lineOfFire } from "@/lib/utils/battle/grid";
import { isUp } from "@/lib/utils/battle/participant/state";
import type { BattleAttack, BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

/** Цілі, яких атакувальник бачить, і ті з них, кого закриває укриття. */
export function useAttackTargets(attacker: BattleParticipant | null, attack: BattleAttack | null, step: string) {
  const scene = useBattleScene();

  const order = scene.battle.initiativeOrder;

  const { visible } = useModeView();

  const alive = (p: BattleParticipant) => isUp(p) || isDying(p);

  const targets = order.filter(
    (p) => alive(p) && !isAirborne(p) && p !== attacker && visible(p) && (p.basicInfo.side !== attacker?.basicInfo.side || scene.battle.campaign?.friendlyFire === true),
  );

  const enemyTargets = targets.filter((p) => p.basicInfo.side !== attacker?.basicInfo.side);

  const map = scene.battle.map;

  const cover = useMemo(() => {
    if (step === "closed" || !attacker || !attack || !map || attackKindOf(attack.type) !== AttackType.RANGED) return new Set<string>();

    const seen = order.filter((p) => p === attacker || visible(p));

    const candidates = seen.filter((p) => p !== attacker && alive(p));

    return new Set(candidates.filter((t) => lineOfFire(map, seen, attacker, t).blocked).map((t) => t.basicInfo.id));
  }, [step, attacker, attack, map, order, visible]);

  const rules = scene.battle.rules;

  const unreachable = useMemo(() => {
    const out = new Map<string, LogLine>();

    if (step !== "target" || !attacker || !attack || !map || !attacker.battleData.position) return out;

    for (const t of targets) {
      const error = attackReachError(map, order, attacker, attack, [t], rules);

      if (error) out.set(t.basicInfo.id, error);
    }

    return out;
  }, [step, attacker, attack, map, order, rules, targets]);

  return { targets, enemyTargets, cover, unreachable, visible };
}
