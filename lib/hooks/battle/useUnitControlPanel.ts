"use client";

import { useBattleScene } from "./useBattleScene";

import type { SelectOption } from "@/components/ui/select-field";
import { CONTROLLED_BY_DM } from "@/lib/constants/characters";
import { allyOwners, controlledByDm, freeUnits, isAssignableUnit, ownerHeroNames } from "@/lib/utils/battle/participant/unit-control";
import type { BattleParticipant } from "@/types/battle";

export function useUnitControlPanel() {
  const { battle, viewer, actions } = useBattleScene();

  const order = battle.initiativeOrder;

  const dmId = viewer.isDM ? viewer.userId : null;

  const owners = dmId ? allyOwners(order, dmId) : [];

  const options: SelectOption[] = [{ value: CONTROLLED_BY_DM, label: "ДМ" }, ...owners.map((o) => ({ value: o, label: ownerHeroNames(order, o) }))];

  return {
    options,
    canRandomize: owners.length > 0 && freeUnits(order, dmId).length > 0,
    randomize: () => actions.unitControl.mutate({ mode: "random" }),
    isAssignable: (p: BattleParticipant) => viewer.isDM && isAssignableUnit(p),
    valueOf: (p: BattleParticipant) => (controlledByDm(p, dmId) ? CONTROLLED_BY_DM : p.basicInfo.controlledBy),
    assign: (p: BattleParticipant, controlledBy: string) => actions.unitControl.mutate({ mode: "assign", participantId: p.basicInfo.id, controlledBy }),
  };
}
