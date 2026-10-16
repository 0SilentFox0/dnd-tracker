"use client";

import { useMemo } from "react";

import { LogTimeline } from "./LogTimeline";

import { BattleLogLoadEarlier } from "@/components/battle/log/BattleLogLoadEarlier";
import { useBattleScene } from "@/lib/hooks/battle";
import { sanitizeLogEntry } from "@/lib/utils/battle/view";

export function BattleLog() {
  const { battle, viewer, log } = useBattleScene();

  const { battleLog, initiativeOrder } = battle;

  const entries = useMemo(() => [...(battleLog ?? [])].reverse().map((e) => sanitizeLogEntry(e, viewer)), [battleLog, viewer]);

  return (
    <>
      <LogTimeline entries={entries} participants={initiativeOrder} focus={log.focus} />
      <BattleLogLoadEarlier />
    </>
  );
}
