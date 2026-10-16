import { BATTLE_ACTION_LABELS } from "@/lib/constants/battle";
import { getLogEntryDetailLines } from "@/lib/utils/battle/view/log-format";
import type { BattleAction } from "@/types/battle";

export interface LogEntryView {
  headline: string;
  lines: string[];
  hp: { id: string; name: string; delta: number }[];
  kindLabel: string;
  hasDetails: boolean;
  isTrigger: boolean;
}

export interface LogRoundGroup {
  round: number;
  entries: BattleAction[];
}

/** Послідовні записи одного раунду; порядок вхідного списку зберігається. */
export function groupLogByRound(entries: BattleAction[]): LogRoundGroup[] {
  const groups: LogRoundGroup[] = [];

  for (const e of entries) {
    const last = groups.at(-1);

    if (last && last.round === e.round) last.entries.push(e);
    else groups.push({ round: e.round, entries: [e] });
  }

  return groups;
}

/** Запис журналу для показу: перший сегмент — заголовок, решта — підрядки; зміни HP — окремо (шкода з мінусом). */
export function logEntryView(e: BattleAction): LogEntryView {
  const [first = "", ...rest] = e.resultText.split(" | ").map((s) => s.trim()).filter(Boolean);

  const triggers = /^(Тригери [^:]+):\s*(.+)$/.exec(first);

  const headline = triggers ? triggers[1] : first;

  const lines = triggers ? [...triggers[2].split("; ").filter(Boolean), ...rest] : rest;

  const byId = new Map<string, { id: string; name: string; delta: number }>();

  for (const c of e.hpChanges ?? []) {
    const prev = byId.get(c.participantId);

    byId.set(c.participantId, { id: c.participantId, name: c.participantName, delta: (prev?.delta ?? 0) - c.change });
  }

  return {
    headline,
    lines,
    hp: [...byId.values()].filter((h) => h.delta !== 0),
    kindLabel: BATTLE_ACTION_LABELS[e.actionType] ?? "подія",
    hasDetails: getLogEntryDetailLines(e).length > 0,
    isTrigger: !!triggers,
  };
}
