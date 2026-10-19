"use client";

import { useState } from "react";

import { useAbilityMapAim } from "./useAbilityMapAim";
import { useBattleScene } from "./useBattleScene";

import { abilityMaxTargets, toggleAbilityTarget } from "@/lib/utils/battle/validation/ability-targets";
import { abilityOnMap, abilityOptions, bonusTargetCandidates, bonusTargetSide, needsBonusTarget } from "@/lib/utils/battle/view";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant, GridPoint } from "@/types/battle";

type Trigger = "bonusAction" | "action";

function targetField(trigger: Trigger, ids: string[]) {
  if (trigger === "action") return ids.length > 0 ? { targetParticipantIds: ids } : {};

  if (ids.length > 1) return { targetParticipantIds: ids };

  return ids[0] ? { targetParticipantId: ids[0] } : {};
}

export function useAbilityPicker(participant: BattleParticipant, trigger: Trigger, done: { onOpenChange: (open: boolean) => void; onDone: () => void }) {
  const { roster: { allies, enemies }, actions, battle } = useBattleScene();

  const [ability, setAbility] = useState<ResolvedAbility | null>(null);

  const [picked, setPicked] = useState<string[]>([]);

  const reset = () => {
    setAbility(null);
    setPicked([]);
  };

  const fire = async (a: ResolvedAbility, targetIds: string[] = [], targetCell?: GridPoint) => {
    const body = { participantId: participant.basicInfo.id, abilityKey: a.key, ...(targetCell && { targetCell }), ...targetField(trigger, targetIds) };

    try {
      if (trigger === "action") await actions.abilityAction.mutateAsync(body);
      else await actions.bonusAction.mutateAsync(body);
    } catch {
      return;
    }

    reset();
    done.onOpenChange(false);
    done.onDone();
  };

  const mapAim = useAbilityMapAim(participant, (a, cell) => void fire(a, [], cell));

  const onMap = abilityOnMap(battle.map, participant);

  const pick = (a: ResolvedAbility) => {
    if (a.aim && onMap) {
      mapAim.start(a);
      done.onOpenChange(false);
    } else if (needsBonusTarget(a, onMap)) setAbility(a);
    else void fire(a);
  };

  const max = ability ? abilityMaxTargets(ability) : 1;

  const aiming = {
    ability,
    side: ability ? bonusTargetSide(ability) : null,
    max,
    candidates: ability ? bonusTargetCandidates(ability, allies, enemies, participant) : [],
    picked,
    choose: (id: string) => {
      if (!ability) return;

      if (max === 1) void fire(ability, [id]);
      else setPicked(toggleAbilityTarget(picked, id, max));
    },
    confirm: () => ability && void fire(ability, picked),
  };

  return {
    abilities: abilityOptions(participant, trigger, battle.currentRound),
    isPending: actions.bonusAction.isPending || actions.abilityAction.isPending,
    aiming,
    mapAim,
    pick,
    reset,
  };
}
