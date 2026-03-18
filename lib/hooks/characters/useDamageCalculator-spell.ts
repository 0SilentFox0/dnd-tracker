/**
 * Логіка вибору заклинання та скілів для заклинання в useDamageCalculator.
 */

import { useMemo } from "react";

import type { Spell } from "@/types/spells";

export function useDamageCalculatorSpell(
  selectedSpellId: string | null,
  knownSpellIds: string[],
  spellsList: Spell[],
  skillsList: Array<{
    id: string;
    spellGroupId?: string | null;
    spellGroup?: { id: string } | null;
    basicInfo?: { name?: string };
    name?: string;
    spellEnhancementData?: { spellEffectIncrease?: number };
  }>,
  unlockedSkillIds: Set<string>,
) {
  const knownSpells = useMemo(
    () =>
      spellsList.filter((s: { id: string }) => knownSpellIds.includes(s.id)),
    [spellsList, knownSpellIds],
  );

  const skillsAffectingSpell = useMemo(() => {
    if (!selectedSpellId) return [];

    const spell = knownSpells.find(
      (s: { id: string }) => s.id === selectedSpellId,
    );

    const groupId = spell?.spellGroup?.id ?? spell?.groupId ?? null;

    if (!groupId) return [];

    return skillsList
      .filter((s) => {
        if (!unlockedSkillIds.has(s.id)) return false;

        const sid = s.spellGroupId ?? s.spellGroup?.id ?? null;

        return sid === groupId;
      })
      .map((s) => ({
        name:
          (s.basicInfo as { name?: string } | undefined)?.name ??
          (s as { name?: string }).name ??
          "—",
        bonus:
          (s.spellEnhancementData as { spellEffectIncrease?: number } | undefined)
            ?.spellEffectIncrease ?? 0,
      }))
      .filter((x: { bonus: number }) => x.bonus > 0);
  }, [selectedSpellId, knownSpells, skillsList, unlockedSkillIds]);

  const selectedSpell = useMemo(
    () =>
      selectedSpellId
        ? knownSpells.find((s: { id: string }) => s.id === selectedSpellId) ??
          null
        : null,
    [selectedSpellId, knownSpells],
  );

  const magicDiceSides = useMemo(() => {
    if (!selectedSpell) return [];

    const c = selectedSpell.diceCount ?? 0;

    const t = selectedSpell.diceType;

    const sides = t
      ? parseInt(String(t).replace(/\D/g, "") || "6", 10)
      : 6;

    return Array.from({ length: c }, () => sides);
  }, [selectedSpell]);

  return {
    knownSpells,
    skillsAffectingSpell,
    selectedSpell,
    magicDiceSides,
  };
}
