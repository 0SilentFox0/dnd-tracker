"use client";

import { useSpells } from "@/lib/hooks/spells";

export function SpellListHint({ campaignId, tag }: { campaignId: string; tag: string }) {
  const { data: spells = [] } = useSpells(campaignId);

  const count = spells.filter((s) => s.lists?.includes(tag)).length;

  return <p className={count === 0 ? "text-xs text-hud-danger" : "text-xs text-hud-muted"}>{count === 0 ? `Жодне заклинання не має тегу «${tag}»` : `Заклинань у списку: ${count}`}</p>;
}
