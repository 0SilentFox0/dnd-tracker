"use client";

import { useMemo } from "react";

import { useBackgrounds } from "@/lib/hooks/backgrounds";
import { useClasses } from "@/lib/hooks/classes";
import { useFeats } from "@/lib/hooks/feats";
import { useRaces } from "@/lib/hooks/races";
import { useSpellRefs } from "@/lib/hooks/spells";
import { hasSpellChoice, readChoices } from "@/lib/utils/characters/choices/read";
import type { ChoiceRefs } from "@/lib/utils/characters/choices/walk";
import { classesById } from "@/lib/utils/characters/classes/lookup";
import type { Choice, FeatData, SpellRef } from "@/types/choices";
import type { GameClassData } from "@/types/classes";

const NO_SPELLS: SpellRef[] = [];

const classChoices = (cls: GameClassData): Choice[] => [...cls.features, ...cls.subclasses.flatMap((s) => s.features)].flatMap((f) => f.choices ?? []);

export type ChoiceRefsView = ChoiceRefs & { ready: boolean; feats: FeatData[]; spells: SpellRef[] };

export function useChoiceRefs(campaignId: string, raceName: string, opts: { enabled?: boolean } = {}): ChoiceRefsView {
  const enabled = opts.enabled ?? true;

  const backgrounds = useBackgrounds(campaignId, { enabled });

  const races = useRaces(campaignId, { enabled });

  const classes = useClasses(campaignId, { enabled });

  const feats = useFeats(campaignId, { enabled });

  const raceRow = races.data?.find((r) => r.name === raceName);

  const raceChoices = useMemo(() => readChoices((raceRow as { choices?: unknown } | undefined)?.choices), [raceRow]);

  const needsSpells = useMemo(
    () => hasSpellChoice([raceChoices, ...(backgrounds.data ?? []).map((b) => b.choices), ...(feats.data ?? []).map((f) => f.choices), ...(classes.data ?? []).map(classChoices)]),
    [raceChoices, backgrounds.data, feats.data, classes.data],
  );

  const libsReady = !!backgrounds.data && !!races.data && !!classes.data && !!feats.data;

  const spells = useSpellRefs(campaignId, { enabled: enabled && libsReady && needsSpells });

  return useMemo(() => {
    const spellRefs = spells.data ?? NO_SPELLS;

    return {
      ready: libsReady && (!needsSpells || !!spells.data),
      backgroundsById: Object.fromEntries((backgrounds.data ?? []).map((b) => [b.id, b])),
      race: raceRow && raceChoices.length > 0 ? { id: raceRow.id, name: raceRow.name, choices: raceChoices } : null,
      classesById: classesById(classes.data ?? []),
      featsById: Object.fromEntries((feats.data ?? []).map((f) => [f.id, f])),
      spellsById: Object.fromEntries(spellRefs.map((s) => [s.id, s])),
      feats: feats.data ?? [],
      spells: spellRefs,
    };
  }, [backgrounds.data, classes.data, feats.data, spells.data, libsReady, needsSpells, raceRow, raceChoices]);
}
