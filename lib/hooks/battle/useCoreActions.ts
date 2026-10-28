"use client";

import { useMemo } from "react";

import { useBattleScene } from "./useBattleScene";

import type { CoreActionBody } from "@/lib/hooks/battles";
import { isAttackable } from "@/lib/utils/abilities/engine/core/participants";
import { coreActionAvailability, coreActionCost, coreActionTargets } from "@/lib/utils/battle/actions/availability";
import { reactionBlocker } from "@/lib/utils/battle/actions/reaction";
import { CORE_ACTION_KEYS, CORE_ACTION_REGISTRY, type CoreActionKey } from "@/lib/utils/battle/actions/registry";
import type { BattleParticipant } from "@/types/battle";

export interface CoreActionChoice {
  key: CoreActionKey;
  targetId?: string;
  mode?: "prone" | "push";
}

function bodyFor(participantId: string, { key, targetId = "", mode = "prone" }: CoreActionChoice): CoreActionBody {
  switch (key) {
    case "shove":
      return { action: key, participantId, targetId, mode };

    case "help":
    case "grapple":
      return { action: key, participantId, targetId };

    default:
      return { action: key, participantId };
  }
}

export const canReadiedAttack = (rulesEnabled: boolean, p: BattleParticipant) => rulesEnabled && !!p.battleData.readied && reactionBlocker(p) === null;

export function useSendCoreAction(onDone?: () => void) {
  const { actions } = useBattleScene();

  const send = async (body: CoreActionBody) => {
    try {
      await actions.coreAction.mutateAsync(body);
    } catch {
      return false;
    }

    onDone?.();

    return true;
  };

  return { send, isPending: actions.coreAction.isPending };
}

export function useReadiedAttack(participant: BattleParticipant, onDone?: () => void) {
  const { battle } = useBattleScene();

  const { send, isPending } = useSendCoreAction(onDone);

  return {
    available: canReadiedAttack(!!battle.rules?.actions.enabled, participant),
    targets: battle.initiativeOrder.filter((p) => p.basicInfo.side !== participant.basicInfo.side && isAttackable(p) && !p.battleData.reserved),
    attack: (targetId: string) => send({ action: "readiedAttack", participantId: participant.basicInfo.id, targetId }),
    isPending,
  };
}

export function useCoreActions(participant: BattleParticipant, onDone?: () => void) {
  const { battle } = useBattleScene();

  const { initiativeOrder, map } = battle;

  const { send, isPending } = useSendCoreAction(onDone);

  const readied = useReadiedAttack(participant, onDone);

  const items = useMemo(() => CORE_ACTION_KEYS.map((key) => ({ key, def: CORE_ACTION_REGISTRY[key], cost: coreActionCost(key, participant, initiativeOrder), ...coreActionAvailability(key, participant, initiativeOrder, map) })), [participant, initiativeOrder, map]);

  return {
    enabled: !!battle.rules?.actions.enabled,
    items,
    targetsFor: (key: CoreActionKey) => coreActionTargets(key, participant, initiativeOrder, map),
    run: (choice: CoreActionChoice) => send(bodyFor(participant.basicInfo.id, choice)),
    isPending,
    readied,
  };
}
