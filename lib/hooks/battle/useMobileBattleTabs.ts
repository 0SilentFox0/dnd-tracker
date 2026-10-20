"use client";

import { useCallback, useState } from "react";

import { ParticipantSide } from "@/lib/constants/battle";

export const MAP_TAB = "map";

export type MobileBattleTab = ParticipantSide | typeof MAP_TAB;

/** Вкладки мобільного бою: поки йде наведення на карті, вкладка карти примусова; без карти — остання вкладка списку. */
export function useMobileBattleTabs({ hasMap, mapAim }: { hasMap: boolean; mapAim: boolean }) {
  const [picked, setPicked] = useState<MobileBattleTab>(MAP_TAB);

  const [listTab, setListTab] = useState<ParticipantSide>(ParticipantSide.ENEMY);

  const [expandTick, setExpandTick] = useState(0);

  const tab: MobileBattleTab = hasMap && mapAim ? MAP_TAB : picked === MAP_TAB && !hasMap ? listTab : picked;

  const set = (next: MobileBattleTab) => {
    setPicked(next);

    if (next !== MAP_TAB) setListTab(next);
  };

  const expand = useCallback(() => {
    setPicked(listTab);
    setExpandTick((n) => n + 1);
  }, [listTab]);

  return { tab, set, expand, expandTick };
}
