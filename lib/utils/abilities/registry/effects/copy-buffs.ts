import type { EffectApplyInput, EffectApplyResult } from "./types";

import { findParticipant, updateParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { applySpellTimedEffect } from "@/lib/utils/abilities/engine/effects/opposing-spells";
import { effectSource } from "@/lib/utils/abilities/engine/effects/timed-effects";
import type { Effect } from "@/lib/utils/abilities/schema";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export function applyCopySpellBuffs(input: EffectApplyInput<Extract<Effect, { kind: "copySpellBuffs" }>>): EffectApplyResult {
  const { ability, ownerId, event, ctx } = input;

  const none = { participants: input.participants, messages: [] };

  if (event.type !== "spellCast" || !event.spellId) return none;

  const prefix = `spell:${event.spellId}#`;

  const owner = findParticipant(input.participants, ownerId);

  const buffsOf = (p: BattleParticipant) => p.battleData.activeEffects.filter((e): e is ActiveEffect & { abilityKey: string } => e.type === "buff" && !!e.abilityKey?.startsWith(prefix));

  const donor = event.targetIds
    .map((id) => findParticipant(input.participants, id))
    .find((p) => p && p.basicInfo.id !== ownerId && p.basicInfo.side === owner?.basicInfo.side && buffsOf(p).length > 0);

  const buffs = donor ? buffsOf(donor) : [];

  if (!owner || !buffs.length) return none;

  const messages: string[] = [];

  const participants = updateParticipant(input.participants, ownerId, (p) =>
    buffs.reduce((acc, e) => {
      const { participant, removed } = applySpellTimedEffect(
        acc,
        { timedKey: e.abilityKey, source: effectSource(owner, ability), name: e.name, type: "buff", rounds: e.duration, stackable: false, abilityEffects: e.abilityEffects },
        ctx.round,
      );

      messages.push(...removed.map((r) => `⚖️ ${e.name} знімає «${r.name}» → ${p.basicInfo.name}`), `✨ ${p.basicInfo.name}: отримує «${e.name}» (${ability.name})`);

      return participant;
    }, p),
  );

  return { participants, messages };
}
