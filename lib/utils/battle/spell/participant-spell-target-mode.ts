import type { BattleParticipant } from "@/types/battle";

/**
 * Чи скіл дозволяє вибір кількох цілей для прив’язаного заклинання (тип у БД — target).
 */
export function participantSpellAllowsMultipleTargets(
  participant: BattleParticipant,
  spellId: string,
): boolean {
  for (const s of participant.battleData.activeSkills ?? []) {
    const se = s.spellEnhancements;

    if (!se) continue;

    if (se.spellAoeSpellIds?.includes(spellId)) return true;

    if (
      s.linkedSpellId === spellId &&
      se.spellAllowMultipleTargets === true
    ) {
      return true;
    }
  }

  return false;
}
