"use client";

import { useMemo } from "react";

import { LogTimeline } from "./LogTimeline";

import { BattleLogLoadEarlier } from "@/components/battle/log/BattleLogLoadEarlier";
import { useBattleRules, useBattleScene } from "@/lib/hooks/battle";
import { sanitizeLogEntry } from "@/lib/utils/battle/view";

export function BattleLog() {
  const { battle, viewer, log } = useBattleScene();

  const { hpTerm } = useBattleRules();

  const { battleLog, initiativeOrder, rules } = battle;

  const entries = useMemo(() => [...(battleLog ?? [])].reverse().map((e) => sanitizeLogEntry(e, viewer, { participants: initiativeOrder, rules })), [battleLog, viewer, initiativeOrder, rules]);

  return (
    <>
      <LogTimeline entries={entries} participants={initiativeOrder} focus={log.focus} wounds={hpTerm === "wounds"} />
      <BattleLogLoadEarlier />
    </>
  );
}
