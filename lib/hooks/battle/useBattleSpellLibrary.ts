"use client";

import { useMemo } from "react";

import { useBattleScene } from "./useBattleScene";

import { usePrefetchSpellsByIds, useSpells, useSpellsByIds } from "@/lib/hooks/spells";
import type { BattleParticipant } from "@/types/battle";
import type { BookSpell } from "@/types/spells";

const NO_SPELLS: string[] = [];

/** Відомі закляття одним набором: DM бачить усіх учасників, гравець лише своїх (без витоку ворожих і без рефетчу при кожному призові). */
export function useBattleSpellIds(): string[] {
  const { battle, viewer, roster } = useBattleScene();

  const source = viewer.isDM ? battle.initiativeOrder : roster.myParticipants;

  const key = useMemo(() => [...new Set(source.flatMap((p) => [...p.spellcasting.knownSpells, ...(p.spellcasting.grants ?? []).map((g) => g.spellId), ...p.battleData.resolvedAbilities.flatMap((a) => a.perform?.kind === "spell" ? [a.perform.spellId] : [])]))].sort().join(","), [source]);

  return useMemo(() => (key ? key.split(",") : NO_SPELLS), [key]);
}

const knownBy = (spells: BookSpell[] | undefined, who: BattleParticipant | null) => {
  const ids = new Set([...(who?.spellcasting.knownSpells ?? []), ...(who?.spellcasting.grants ?? []).map((g) => g.spellId)]);

  return (spells ?? []).filter((s) => ids.has(s.id));
};

/** Прогріває закляття бою, поки він простоює. */
export function useSpellBookPrefetch() {
  const { campaignId } = useBattleScene();

  usePrefetchSpellsByIds(campaignId, useBattleSpellIds());
}

const BONUS_NONE: BookSpell[] = [];

/** Відомі гравцеві заклинання за бонусну дію (з кешу книги, яку прогріває useSpellBookPrefetch). */
export function useSpellsWithCost(hero: BattleParticipant, cost: "bonusAction" | "reaction"): BookSpell[] {
  const { campaignId } = useBattleScene();

  const known = useSpellsByIds(campaignId, useBattleSpellIds());

  return useMemo(() => {
    const bonus = knownBy(known.data, hero).filter((s) => s.cost === cost);

    return bonus.length ? bonus : BONUS_NONE;
  }, [known.data, hero, cost]);
}

export const useBonusSpells = (hero: BattleParticipant) => useSpellsWithCost(hero, "bonusAction");

export const useReactionSpells = (hero: BattleParticipant) => useSpellsWithCost(hero, "reaction");

export function useBattleSpellLibrary(caster: BattleParticipant | null, options: { isOpen: boolean; free: boolean; specialSpellId?: string; reactionsOnly?: boolean }): BookSpell[] {
  const { campaignId } = useBattleScene();

  const { isOpen, free, specialSpellId, reactionsOnly } = options;

  const library = useSpells(campaignId, { enabled: isOpen && free });

  const known = useSpellsByIds(campaignId, useBattleSpellIds(), { enabled: isOpen && !free });

  const availableSpells = free ? ((library.data ?? []) as BookSpell[]) : specialSpellId ? (known.data ?? []).filter((s) => s.id === specialSpellId) : knownBy(known.data, caster);

  return reactionsOnly ? availableSpells.filter((s) => s.cost === "reaction") : availableSpells;
}
