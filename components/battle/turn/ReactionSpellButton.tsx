"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import { useBattleSceneData, useReactionSpells, useSpellBook } from "@/lib/hooks/battle";
import { reactionBlockerOf } from "@/lib/utils/battle/actions/access";
import type { BattleParticipant } from "@/types/battle";

const SpellBook = dynamic(() => import("@/components/battle/wizards/SpellBook").then((m) => m.SpellBook), { ssr: false });

export function ReactionSpellButton({ participant }: { participant: BattleParticipant }) {
  const t = useTranslations("battle.turnControls");

  const { battle } = useBattleSceneData();

  const spells = useReactionSpells(participant);

  const book = useSpellBook(participant, { reactionsOnly: true });

  if (!spells.length || reactionBlockerOf(battle.rules, participant)) return null;

  return <>
    <button type="button" onClick={() => book.actions.open()} className="hud-sc mt-2 h-10 w-full border border-hud-line text-sm">{t("reactionSpell")}</button>
    <SpellBook book={book} />
  </>;
}
