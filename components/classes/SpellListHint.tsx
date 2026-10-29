"use client";

import { useTranslations } from "next-intl";

import { useSpells } from "@/lib/hooks/spells";

export function SpellListHint({ campaignId, tag }: { campaignId: string; tag: string }) {
  const t = useTranslations("classes");

  const { data: spells = [] } = useSpells(campaignId);

  const count = spells.filter((s) => s.lists?.includes(tag)).length;

  return <p className={count === 0 ? "text-xs text-hud-danger" : "text-xs text-hud-muted"}>{count === 0 ? t("spellHint.none", { tag }) : t("spellHint.count", { count })}</p>;
}
