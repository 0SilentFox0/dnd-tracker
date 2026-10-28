"use client";

import { useBattleScene } from "./useBattleScene";
import { type UnitControlRow, useUnitControlPanel } from "./useUnitControlPanel";

import { BattleStatus } from "@/lib/constants/battle";
import { useConfirm } from "@/lib/hooks/common";
import type { BattleParticipant } from "@/types/battle";

export interface DmParticipantActions {
  onChangeHp: (p: BattleParticipant) => void;
  onTakeControl: (p: BattleParticipant | null) => void;
  onRemove: (p: BattleParticipant) => void;
  onKill?: (p: BattleParticipant) => void;
  onDone?: () => void;
  unitControl?: UnitControlRow;
}

interface Options {
  onChangeHp: (p: BattleParticipant) => void;
  onDone: () => void;
}

export function useDmParticipantActions({ onChangeHp, onDone }: Options) {
  const { battle, dmControl, actions } = useBattleScene();

  const confirm = useConfirm();

  const unitControl = useUnitControlPanel();

  const isActive = battle.status === BattleStatus.ACTIVE;

  const update = (p: BattleParticipant, data: { removeFromBattle: true } | { kill: true }) =>
    actions.updateParticipant.mutate({ participantId: p.basicInfo.id, data });

  const refreshSources = async () => {
    const ok = await confirm({
      title: "Оновити з бібліотеки?",
      description: "Здібності, атаки, закляття і слоти учасників оновляться з бази кампанії. HP, ефекти й використані ліміти залишаться.",
      confirmLabel: "Оновити",
    });

    if (ok) actions.refreshSources.mutate({});
  };

  const row: DmParticipantActions = {
    onChangeHp,
    onTakeControl: (p) => dmControl.set(p?.basicInfo.id ?? null),
    onRemove: (p) => update(p, { removeFromBattle: true }),
    onKill: isActive ? (p) => update(p, { kill: true }) : undefined,
    onDone,
    unitControl: unitControl.row,
  };

  return {
    row,
    refreshSources: { run: refreshSources, isPending: actions.refreshSources.isPending },
    randomUnits: unitControl.random,
  };
}
