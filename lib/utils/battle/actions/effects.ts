import type { CoreActionKey } from "./registry";

import { EffectMarker } from "@/lib/constants/battle";
import type { TimedEffectInput } from "@/lib/utils/abilities/engine/effects/timed-effects";
import type { StaticEffect } from "@/lib/utils/abilities/schema";

const flag = (f: Record<string, unknown>) => ({ kind: "flag", ...f }) as StaticEffect;

export const coreTimedKey = (action: CoreActionKey, participantId: string) => `core:${action}:${participantId}`;

export const DODGE_KEY_PREFIX = "core:dodge:";

export function disengageEffect(participantId: string): TimedEffectInput {
  return {
    timedKey: coreTimedKey("disengage", participantId),
    name: "Відхід",
    type: "buff",
    rounds: 1,
    stackable: false,
    effects: [{ type: EffectMarker.DISENGAGED, value: 1 }],
    until: "turnEnd",
  };
}

export function dodgeEffect(participantId: string): TimedEffectInput {
  return {
    timedKey: coreTimedKey("dodge", participantId),
    name: "Ухилитися",
    type: "buff",
    rounds: 1,
    stackable: false,
    abilityEffects: [flag({ flag: "disadvantageForAttackers" }), flag({ flag: "saveAdvantage", abilities: ["dexterity"] })],
    until: "nextTurnStart",
  };
}

export function helpEffect(helperId: string): TimedEffectInput {
  return {
    timedKey: coreTimedKey("help", helperId),
    name: "Допомога",
    type: "buff",
    rounds: 1,
    stackable: false,
    abilityEffects: [flag({ flag: "advantage", attackKind: "all" })],
    consumeOn: "ownAttack",
  };
}

export const HIDDEN_MARKER = "hidden";

export function hiddenEffect(participantId: string): TimedEffectInput {
  return {
    timedKey: coreTimedKey("hide", participantId),
    name: "Схований",
    type: "buff",
    rounds: 10,
    stackable: false,
    effects: [{ type: HIDDEN_MARKER, value: 1 }],
    abilityEffects: [flag({ flag: "advantage", attackKind: "all" }), flag({ flag: "disadvantageForAttackers" })],
    consumeOn: "ownAttack",
  };
}
