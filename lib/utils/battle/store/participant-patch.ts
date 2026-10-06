import { stableStringify } from "./stable-json";

import type { BattleParticipantPatch } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

type PatchableFields = { [K in keyof BattleParticipant]?: ReadonlyArray<keyof BattleParticipant[K]> };

// поля, які зберігаються в колонках і state (див. splitParticipant); решта — у знімку й приходить повним учасником
export const PATCHABLE_PARTICIPANT_FIELDS = {
  basicInfo: ["side", "controlledBy"],
  abilities: ["initiative"],
  combatStats: ["currentHp", "tempHp", "maxHp", "morale", "status"],
  spellcasting: ["spellSlots"],
  battleData: ["activeEffects", "abilityUsage", "pendingExtraActions"],
  actionFlags: ["hasUsedAction", "hasUsedBonusAction", "hasUsedReaction", "hasExtraTurn"],
} as const satisfies PatchableFields;

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
