import type { BattleParticipant } from "@/types/battle";

/** Чи покращення заклинань дозволяють вибір кількох цілей для цього заклинання. */
export function participantSpellAllowsMultipleTargets(participant: BattleParticipant, spellId: string): boolean {
  return (participant.battleData.spellEnhancers ?? []).some(
    (e) =>
      e.spellEnhancements.spellAoeSpellIds?.includes(spellId) ||
      (e.linkedSpellId === spellId && e.spellEnhancements.spellAllowMultipleTargets === true),
  );
}
