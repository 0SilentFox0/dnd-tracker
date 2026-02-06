"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import { getSpells } from "@/lib/api/spells";
import type { Spell } from "@/types/spells";
import { BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { CharacterSpellbookDialog } from "./CharacterSpellbookDialog";

interface CharacterArtifactsSectionProps {
  knownSpellIds: string[];
  campaignId: string;
}

const SLOTS_COUNT = 9;

export function CharacterArtifactsSection({
  knownSpellIds,
  campaignId,
}: CharacterArtifactsSectionProps) {
  const [spellbookOpen, setSpellbookOpen] = useState(false);

  const { data: allSpells = [] } = useQuery<Spell[]>({
    queryKey: ["spells", campaignId],
    queryFn: () => getSpells(campaignId),
    enabled: spellbookOpen && !!campaignId,
  });

  const knownSpells = useMemo(() => {
    if (!allSpells.length) return [];
    return knownSpellIds
      .map((id) => allSpells.find((s) => s.id === id))
      .filter((s): s is Spell => !!s);
  }, [allSpells, knownSpellIds]);

  return (
    <div className="w-full">
      <div className="relative w-full max-w-md mx-auto aspect-square rounded-lg overflow-hidden bg-[#2a2520] border border-amber-900/50 shadow-xl">
        {/* Фон лицаря / артефактів */}
        <div className="absolute inset-0">
          <Image
            src="/screen-bg/artefacts-bg.jpg"
            alt=""
            fill
            className="object-cover opacity-40 sepia"
            sizes="(max-width: 448px) 100vw, 448px"
            priority={false}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-900/30 to-stone-950/50" />
        </div>

        {/* Сітка 3x3 слотів */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="grid grid-cols-3 grid-rows-3 gap-2 w-full h-full max-w-[280px] max-h-[280px]">
            {Array.from({ length: SLOTS_COUNT }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded border-2 border-amber-700/80 bg-stone-900/60 shadow-inner"
                title={`Слот артефакту ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Книжка заклинань — правий верхній кут */}
        <button
          type="button"
          onClick={() => setSpellbookOpen(true)}
          className="absolute top-3 right-3 z-10 flex items-center justify-center w-12 h-12 rounded-lg border-2 border-amber-500/90 bg-amber-950/80 text-amber-200 shadow-lg hover:bg-amber-900/80 hover:border-amber-400 transition-colors"
          title="Заклинання героя"
        >
          <BookOpen className="h-6 w-6" />
        </button>
      </div>

      <CharacterSpellbookDialog
        open={spellbookOpen}
        onOpenChange={setSpellbookOpen}
        spells={knownSpells}
      />
    </div>
  );
}
