"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { useBattleScene } from "./useBattleScene";
import { type UnitControlRow, useUnitControlPanel } from "./useUnitControlPanel";

import { BattleStatus } from "@/lib/constants/battle";
import { useConfirm } from "@/lib/hooks/common";
import { hasAnyCondition5e } from "@/lib/utils/battle/conditions";
import type { BattleParticipant } from "@/types/battle";

export interface DmParticipantActions {
  onChangeHp: (p: BattleParticipant) => void;
  onTakeControl: (p: BattleParticipant | null) => void;
  onRemove: (p: BattleParticipant) => void;
  onKill?: (p: BattleParticipant) => void;
  onConditions?: (p: BattleParticipant) => void;
  onToggleLair?: (p: BattleParticipant) => void;
  onLegendary?: (p: BattleParticipant) => void;
  conditionsEnabled?: boolean;
  onDone?: () => void;
  unitControl?: UnitControlRow;
}

interface Options {
  onChangeHp: (p: BattleParticipant) => void;
  onDone: () => void;
}

export function useDmParticipantActions({ onChangeHp, onDone }: Options) {
  const { battle, dmControl, actions } = useBattleScene();

  const t = useTranslations("battleDm.refresh");

  const confirm = useConfirm();

  const unitControl = useUnitControlPanel();

  const [conditionsId, setConditionsId] = useState<string | null>(null);

  const [legendaryId, setLegendaryId] = useState<string | null>(null);

  const isActive = battle.status === BattleStatus.ACTIVE;

  const update = (p: BattleParticipant, data: { removeFromBattle: true } | { kill: true }) =>
    actions.updateParticipant.mutate({ participantId: p.basicInfo.id, data });

  const refreshSources = async () => {
    const ok = await confirm({
      title: t("title"),
      description: t("description"),
      confirmLabel: t("confirm"),
    });

    if (ok) actions.refreshSources.mutate({});
  };

  const row: DmParticipantActions = {
    onChangeHp,
    onTakeControl: (p) => dmControl.set(p?.basicInfo.id ?? null),
    onRemove: (p) => update(p, { removeFromBattle: true }),
    onConditions: isActive ? (p) => setConditionsId(p.basicInfo.id) : undefined,
    onToggleLair: isActive ? (p) => actions.updateParticipant.mutate({ participantId: p.basicInfo.id, data: { lairActive: !p.battleData.lair?.active } }) : undefined,
    onLegendary: isActive ? (p) => setLegendaryId(p.basicInfo.id) : undefined,
    conditionsEnabled: (battle.rules?.conditions.enabled ?? false) || (battle.initiativeOrder ?? []).some(hasAnyCondition5e),
    onKill: isActive ? (p) => update(p, { kill: true }) : undefined,
    onDone,
    unitControl: unitControl.row,
  };

  const conditionsTarget = useMemo(() => (battle.initiativeOrder ?? []).find((p) => p.basicInfo.id === conditionsId) ?? null, [battle.initiativeOrder, conditionsId]);

  const legendaryTarget = useMemo(() => (battle.initiativeOrder ?? []).find((p) => p.basicInfo.id === legendaryId) ?? null, [battle.initiativeOrder, legendaryId]);

  return {
    row,
    conditions: { target: conditionsTarget, custom: battle.rules?.conditions.custom, close: () => setConditionsId(null), submit: actions.conditions.mutate, isPending: actions.conditions.isPending },
    legendary: { target: legendaryTarget, close: () => setLegendaryId(null) },
    refreshSources: { run: refreshSources, isPending: actions.refreshSources.isPending },
    randomUnits: unitControl.random,
  };
}
