"use client";

import dynamic from "next/dynamic";

import { useReactionSpells, useSpellBook } from "@/lib/hooks/battle";
import { reactionBlocker } from "@/lib/utils/battle/actions/reaction";
import type { BattleParticipant } from "@/types/battle";

const SpellBook = dynamic(() => import("@/components/battle/wizards/SpellBook").then((m) => m.SpellBook), { ssr: false });

export function ReactionSpellButton({ participant }: { participant: BattleParticipant }) {
  const spells = useReactionSpells(participant);

  const book = useSpellBook(participant, { reactionsOnly: true });

  if (!spells.length || reactionBlocker(participant)) return null;

  return <>
    <button type="button" onClick={() => book.actions.open()} className="hud-sc mt-2 h-10 w-full border border-hud-line text-sm">Заклинання реакцією</button>
    <SpellBook book={book} />
  </>;
}
