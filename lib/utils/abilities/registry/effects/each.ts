import type { EffectApplyInput, EffectApplyResult } from "./types";

import { textRef } from "@/lib/i18n/text-ref";
import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant, participantNames, updateParticipant } from "@/lib/utils/abilities/engine/core/participants";
import type { ConditionImmunityKey } from "@/lib/utils/abilities/schema";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export function each(
  input: EffectApplyInput,
  fn: (p: BattleParticipant) => BattleParticipant | null,
  message: (names: string) => LogLine,
  immune?: (p: BattleParticipant) => boolean,
): EffectApplyResult {
  let ps = input.participants;

  const touched: string[] = [];

  const blocked: string[] = [];

  for (const id of input.targetIds) {
    const p = findParticipant(ps, id);

    if (p && immune?.(p)) {
      blocked.push(id);
      continue;
    }

    const next = p ? fn(p) : null;

    if (!next) continue;

    ps = updateParticipant(ps, id, () => next);
    touched.push(id);
  }

  const messages = touched.length ? [message(participantNames(ps, touched))] : [];

  if (blocked.length) messages.push(textRef("abilityText.log.immune", { ability: input.ability.name, target: participantNames(ps, blocked) }));

  return { participants: ps, messages };
}

export function immuneTo(ps: BattleParticipant[], id: string, key: ConditionImmunityKey): boolean {
  return findFlags(ps, id, "conditionImmunity").some((f) => f.conditions === "all" || f.conditions.includes(key));
}
