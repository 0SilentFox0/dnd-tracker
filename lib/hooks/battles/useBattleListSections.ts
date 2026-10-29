"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { BattleStatus } from "@/lib/constants/battle";
import { useSearch } from "@/lib/hooks/common";

const BATTLE_SECTIONS = [BattleStatus.ACTIVE, BattleStatus.PREPARED, BattleStatus.COMPLETED] as const;

const battleFields = (battle: { name: string }) => [battle.name];

export function useBattleListSections<B extends { name: string; status: string }>(battles: B[]) {
  const t = useTranslations("battleSetup.list.sections");

  const search = useSearch(battles, battleFields);

  const sections = useMemo(
    () => BATTLE_SECTIONS.map((kind) => ({ kind, title: t(kind), battles: search.items.filter((b) => b.status === kind) })).filter((s) => s.battles.length > 0),
    [search.items, t],
  );

  return { search, sections };
}
