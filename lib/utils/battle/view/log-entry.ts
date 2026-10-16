import type { BattleAction } from "@/types/battle";

export interface LogEntryView {
  headline: string;
  lines: string[];
  hp: { id: string; name: string; delta: number }[];
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

  return { headline, lines, hp: [...byId.values()].filter((h) => h.delta !== 0) };
}
