"use client";

import { useMemo } from "react";

import { BattleStatus } from "@/lib/constants/battle";
import { useSearch } from "@/lib/hooks/common";

const BATTLE_SECTIONS: { kind: BattleStatus; title: string }[] = [
  { kind: BattleStatus.ACTIVE, title: "Активні бої" },
  { kind: BattleStatus.PREPARED, title: "Підготовлені бої" },
  { kind: BattleStatus.COMPLETED, title: "Завершені бої" },
];

const battleFields = (battle: { name: string }) => [battle.name];

export function useBattleListSections<B extends { name: string; status: string }>(battles: B[]) {
  const search = useSearch(battles, battleFields);

  const sections = useMemo(
    () => BATTLE_SECTIONS.map(({ kind, title }) => ({ kind, title, battles: search.items.filter((b) => b.status === kind) })).filter((s) => s.battles.length > 0),
    [search.items],
  );

  return { search, sections };
}
