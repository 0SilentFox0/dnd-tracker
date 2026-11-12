"use client";

import { useMemo } from "react";

import { useBattleScene } from "./useBattleScene";

import type { CoreActionBody } from "@/lib/hooks/battles";
import { isAttackable } from "@/lib/utils/abilities/engine/core/participants";
import { coreActionsOn, reactionBlockerOf } from "@/lib/utils/battle/actions/access";
import { CORE_ACTION_KEYS, type CoreActionKey } from "@/lib/utils/battle/actions/keys";
import { isHostile } from "@/lib/utils/battle/modes/engine";
import type { Ruleset } from "@/lib/utils/rules/schema";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
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

export const canReadiedAttack = (rules: Ruleset | null | undefined, p: BattleParticipant) => coreActionsOn(rules) && !!p.battleData.readied && reactionBlockerOf(rules, p) === null;

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
    available: canReadiedAttack(battle.rules, participant),
    targets: battle.initiativeOrder.filter((p) => isHostile(battle.map, participant, p) && isAttackable(p) && !p.battleData.reserved),
    attack: (targetId: string) => send({ action: "readiedAttack", participantId: participant.basicInfo.id, targetId }),
    isPending,
  };
}

export function useCoreActions(participant: BattleParticipant, onDone?: () => void) {
  const { battle } = useBattleScene();

  const { initiativeOrder, map } = battle;

  const { send, isPending } = useSendCoreAction(onDone);

  const readied = useReadiedAttack(participant, onDone);

  const { actions } = ruleSystemOf(battle.rules).combat;

  const items = useMemo(
    () => CORE_ACTION_KEYS.flatMap((key) => {
      const def = actions.catalog[key];

      return def ? [{ key, def, cost: actions.cost(key, participant, initiativeOrder), ...actions.available(key, participant, initiativeOrder, map, battle.rules) }] : [];
    }),
    [actions, participant, initiativeOrder, map, battle.rules],
  );

  return {
    enabled: coreActionsOn(battle.rules),
    items,
    targetsFor: (key: CoreActionKey) => actions.targets(key, participant, initiativeOrder, map),
    run: (choice: CoreActionChoice) => send(bodyFor(participant.basicInfo.id, choice)),
    isPending,
    readied,
  };
}
