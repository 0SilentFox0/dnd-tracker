import { stableStringify } from "./stable-json";

import { MAP_MODE_REGISTRY } from "@/lib/utils/battle/modes/registry";
import type { BattleParticipantPatch } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

type PatchableFields = { [K in keyof BattleParticipant]?: ReadonlyArray<keyof BattleParticipant[K]> };

// поля, які зберігаються в колонках і state (див. splitParticipant); решта — у знімку й приходить повним учасником
const CORE_PATCHABLE_FIELDS = {
  basicInfo: ["side", "controlledBy"],
  abilities: ["initiative"],
  combatStats: ["currentHp", "tempHp", "maxHp", "morale", "status"],
  spellcasting: ["spellSlots"],
  battleData: ["activeEffects", "abilityUsage", "pendingExtraActions", "position", "movementUsed", "turnStartPosition", "returnedThisTurn", "airborne", "hazardHitRound", "zoneHits", "retaliationsUsed", "dormant", "escaped", "mazeWakeRound"],
  actionFlags: ["hasUsedAction", "hasUsedBonusAction", "hasUsedReaction", "hasExtraTurn"],
} as const satisfies PatchableFields;

const modePatchableFields = Object.values(MAP_MODE_REGISTRY).flatMap((m) => m.server.patchableFields ?? []) as Array<keyof BattleParticipant["battleData"]>;

export const PATCHABLE_PARTICIPANT_FIELDS: PatchableFields = {
  ...CORE_PATCHABLE_FIELDS,
  battleData: [...CORE_PATCHABLE_FIELDS.battleData, ...modePatchableFields],
};

export const FULL_PARTICIPANT = "full";

export function buildParticipantPatch(
  before: BattleParticipant,
  after: BattleParticipant,
): BattleParticipantPatch | typeof FULL_PARTICIPANT | null {
  const patch: Record<string, Record<string, unknown>> = {};

  for (const [section, fields] of Object.entries(PATCHABLE_PARTICIPANT_FIELDS)) {
    const prev = before[section as keyof BattleParticipant] as unknown as Record<string, unknown>;

    const next = after[section as keyof BattleParticipant] as unknown as Record<string, unknown>;

    for (const field of fields) {
      if (stableStringify(prev[field]) === stableStringify(next[field])) continue;

      // undefined не переживає JSON — клієнт не дізнається про видалення поля
      if (next[field] === undefined) return FULL_PARTICIPANT;

      patch[section] = { ...patch[section], [field]: next[field] };
    }
  }

  return Object.keys(patch).length === 0 ? null : { id: after.basicInfo.id, ...patch };
}
