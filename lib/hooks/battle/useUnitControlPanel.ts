"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { useBattleScene } from "./useBattleScene";

import { CONTROLLED_BY_DM } from "@/lib/constants/characters";
import { allyOwners, controlledByDm, freeUnits, isAssignableUnit, ownerHeroNames } from "@/lib/utils/battle/participant/unit-control";
import type { BattleParticipant } from "@/types/battle";

export interface UnitControlRow {
  options: { value: string; label: string }[];
  isAssignable: (p: BattleParticipant) => boolean;
  valueOf: (p: BattleParticipant) => string;
  assign: (p: BattleParticipant, controlledBy: string) => void;
}

export function useUnitControlPanel() {
  const t = useTranslations("battle.unitControl");

  const { battle, viewer, actions } = useBattleScene();

  const order = battle.initiativeOrder;

  const dmId = viewer.isDM ? viewer.userId : null;

  const { options, canRandomize } = useMemo(() => {
    const owners = dmId ? allyOwners(order, dmId) : [];

    return {
      options: [{ value: CONTROLLED_BY_DM, label: t("dm") }, ...owners.map((o) => ({ value: o, label: ownerHeroNames(order, o) }))],
      canRandomize: owners.length > 0 && freeUnits(order, dmId).length > 0,
    };
  }, [order, dmId, t]);

  const { mutate, isPending } = actions.unitControl;

  return {
    random: { can: canRandomize, run: () => mutate({ mode: "random" }), isPending },
    row: {
      options,
      isAssignable: (p: BattleParticipant) => viewer.isDM && isAssignableUnit(p),
      valueOf: (p: BattleParticipant) => (controlledByDm(p, dmId) ? CONTROLLED_BY_DM : p.basicInfo.controlledBy),
      assign: (p: BattleParticipant, controlledBy: string) => mutate({ mode: "assign", participantId: p.basicInfo.id, controlledBy }),
    } satisfies UnitControlRow,
  };
}
