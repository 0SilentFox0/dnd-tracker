import type { EffectApplyInput, EffectApplyResult } from "./types";

import { findParticipant, updateParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { dropOpposingSpellEffects } from "@/lib/utils/abilities/engine/effects/opposing-spells";
import { effectSource, upsertTimedEffect } from "@/lib/utils/abilities/engine/effects/timed-effects";
import type { Effect } from "@/lib/utils/abilities/schema";
import type { BattleParticipant } from "@/types/battle";

export function applyCopySpellBuffs(input: EffectApplyInput<Extract<Effect, { kind: "copySpellBuffs" }>>): EffectApplyResult {
  const { ability, ownerId, event, ctx } = input;

  const none = { participants: input.participants, messages: [] };

  if (event.type !== "spellCast" || !event.spellId) return none;

  const prefix = `spell:${event.spellId}#`;

  const owner = findParticipant(input.participants, ownerId);

  const buffsOf = (p: BattleParticipant) => p.battleData.activeEffects.filter((e) => e.type === "buff" && e.abilityKey?.startsWith(prefix));

  const donor = event.targetIds
    .map((id) => findParticipant(input.participants, id))
    .find((p) => p && p.basicInfo.id !== ownerId && p.basicInfo.side === owner?.basicInfo.side && buffsOf(p).length > 0);

  const buffs = donor ? buffsOf(donor) : [];

  if (!owner || !buffs.length) return none;

  const messages: string[] = [];

  const participants = updateParticipant(input.participants, ownerId, (p) =>
    buffs.reduce((acc, e) => {
      messages.push(`✨ ${p.basicInfo.name}: отримує «${e.name}» (${ability.name})`);

      const cleared = (e.abilityEffects ?? []).reduce((q, se) => dropOpposingSpellEffects(q, e.abilityKey as string, se).participant, acc);

      return upsertTimedEffect(
        cleared,
        { timedKey: e.abilityKey as string, source: effectSource(owner, ability), name: e.name, type: "buff", rounds: e.duration, stackable: false, abilityEffects: e.abilityEffects },
        ctx.round,
      );
    }, p),
  );

  return { participants, messages };
}
