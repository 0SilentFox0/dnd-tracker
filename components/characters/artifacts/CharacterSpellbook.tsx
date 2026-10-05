"use client";

import { useMemo, useState } from "react";
import { BookOpen } from "lucide-react";

import { CharacterSpellbookDialog } from "./CharacterSpellbookDialog";

import { useCharacterLearnedSpellIds } from "@/lib/hooks/skills";
import { useSpells } from "@/lib/hooks/spells";
import type { Spell } from "@/types/spells";

export interface CharacterSpellbookProps {
  knownSpellIds: string[];
  campaignId: string;
  characterId?: string;
}

export function CharacterSpellbook({ knownSpellIds, campaignId, characterId }: CharacterSpellbookProps) {
  const [spellbookOpen, setSpellbookOpen] = useState(false);

  const { data: allSpells = [] } = useSpells(campaignId, { enabled: spellbookOpen });

  const learnedSpellIds = useCharacterLearnedSpellIds(campaignId, characterId, knownSpellIds);

  const knownSpells = useMemo(
    () => learnedSpellIds.map((id) => allSpells.find((s) => s.id === id)).filter((s): s is Spell => !!s),
    [allSpells, learnedSpellIds],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setSpellbookOpen(true)}
        className="flex shrink-0 items-center justify-center w-12 h-12 rounded-lg border-2 border-amber-500/90 bg-amber-950/80 text-amber-200 shadow-lg hover:bg-amber-900/80 hover:border-amber-400 transition-colors"
        title="Заклинання героя"
      >
        <BookOpen className="h-6 w-6" />
      </button>
      <CharacterSpellbookDialog
        open={spellbookOpen}
        onOpenChange={setSpellbookOpen}
        spells={knownSpells}
      />
    </>
  );
}
