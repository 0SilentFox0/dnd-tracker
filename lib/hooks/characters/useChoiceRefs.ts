"use client";

import { useMemo } from "react";

import { useClasses } from "@/lib/hooks/classes";
import { useFeats } from "@/lib/hooks/feats";
import { useRaces } from "@/lib/hooks/races";
import { useSpells } from "@/lib/hooks/spells";
import { readChoices } from "@/lib/utils/characters/choices/read";
import type { ChoiceRefs } from "@/lib/utils/characters/choices/walk";
import type { FeatData, SpellRef } from "@/types/choices";

export type ChoiceRefsView = ChoiceRefs & { ready: boolean; feats: FeatData[]; spells: SpellRef[] };

export function useChoiceRefs(campaignId: string, raceName: string, opts: { enabled?: boolean } = {}): ChoiceRefsView {
  const enabled = opts.enabled ?? true;

  const races = useRaces(campaignId, { enabled });

  const classes = useClasses(campaignId, { enabled });

  const feats = useFeats(campaignId, { enabled });

  const spells = useSpells(campaignId, { enabled });

  return useMemo(() => {
    const row = races.data?.find((r) => r.name === raceName);

    const choices = readChoices((row as { choices?: unknown } | undefined)?.choices);

    const spellRefs: SpellRef[] = (spells.data ?? []).map((s) => ({ id: s.id, name: s.name, level: s.level, lists: s.lists ?? [] }));

    return {
      ready: !!races.data && !!classes.data && !!feats.data && !!spells.data,
      race: row && choices.length > 0 ? { id: row.id, name: row.name, choices } : null,
      classesById: Object.fromEntries((classes.data ?? []).map((c) => [c.id, c])),
      featsById: Object.fromEntries((feats.data ?? []).map((f) => [f.id, f])),
      spellsById: Object.fromEntries(spellRefs.map((s) => [s.id, s])),
      feats: feats.data ?? [],
      spells: spellRefs,
    };
  }, [races.data, classes.data, feats.data, spells.data, raceName]);
}
