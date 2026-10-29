import { BATTLE_ACTION_LABELS } from "@/lib/constants/battle";
import { splitLegacyTriggers } from "@/lib/utils/battle/log/legacy";
import { actionLines } from "@/lib/utils/battle/log/lines";
import { getLogEntryDetailItems } from "@/lib/utils/battle/view/log-format";
import type { BattleAction } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface LogEntryView {
  headline: LogLine;
  lines: LogLine[];
  hp: { id: string; name: string; delta: number }[];
  kindLabel: string;
  hasDetails: boolean;
  isTrigger: boolean;
  kind?: "hazard";
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

/** Headline and sub-lines of an entry: structured logs are used as they are, legacy rows are split the old way. */
export function logParts(e: Pick<BattleAction, "log" | "resultText">): { headline: LogLine; lines: LogLine[]; isTrigger: boolean } {
  const parts = splitLegacyTriggers(actionLines(e));

  if (!e.log) return parts;

  const first = e.log[0];

  return { ...parts, isTrigger: typeof first === "object" && first.message.startsWith("battleLog.triggers.") };
}

/** Запис журналу для показу: перший сегмент — заголовок, решта — підрядки; зміни HP — окремо (шкода з мінусом). */
export function logEntryView(e: BattleAction): LogEntryView {
  const { headline, lines, isTrigger } = logParts(e);

  const byId = new Map<string, { id: string; name: string; delta: number }>();

  for (const c of e.hpChanges ?? []) {
    const prev = byId.get(c.participantId);

    byId.set(c.participantId, { id: c.participantId, name: c.participantName, delta: (prev?.delta ?? 0) - c.change });
  }

  const hazard = !!e.actionDetails?.hazard;

  return {
    headline,
    lines,
    hp: [...byId.values()].filter((h) => h.delta !== 0),
    kindLabel: hazard ? "небезпека" : (BATTLE_ACTION_LABELS[e.actionType] ?? "подія"),
    hasDetails: getLogEntryDetailItems(e).length > 0,
    isTrigger,
    ...(hazard && { kind: "hazard" as const }),
  };
}
