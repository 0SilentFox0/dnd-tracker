import { describe, expect, it, vi } from "vitest";

import { loadKnowledgeEvents, loadRecentEvents } from "@/lib/utils/battle/store/history";
import type { BattleDb } from "@/lib/utils/battle/store/load-battle";
import { summarizeKnowledge } from "@/lib/utils/battle/view/knowledge";

type Row = { seq: number; round: number; type: string; actorId: string; targets: unknown; details: unknown; cancelledAt: Date | null; createdAt: Date; hpChanges: unknown; resultText: string };

const attack = (seq: number, target: string, total: number, hit: boolean): Row => ({
  seq,
  round: 1,
  type: "attack",
  actorId: "hero",
  targets: [{ participantId: target, participantName: target }],
  details: { actorName: "Герой", actorSide: "ally", actionDetails: { totalAttackValue: total, isHit: hit, isCritical: false, isCriticalFail: false } },
  cancelledAt: null,
  createdAt: new Date(),
  hpChanges: [],
  resultText: "",
});

const filler = (seq: number): Row => ({ ...attack(seq, "other", 0, false), type: "end_turn", details: { actionDetails: {} } });

function fakeDb(rows: Row[]) {
  const findMany = vi.fn(async (args: { where: { type?: { in: string[] }; cancelledAt: null }; orderBy: { seq: "asc" | "desc" }; take?: number }) => {
    let list = rows.filter((r) => r.cancelledAt === null && (!args.where.type || args.where.type.in.includes(r.type)));

    list = [...list].sort((a, b) => (args.orderBy.seq === "asc" ? a.seq - b.seq : b.seq - a.seq));

    return args.take ? list.slice(0, args.take) : list;
  });

  return { db: { battleEvent: { findMany } } as unknown as BattleDb, findMany };
}

describe("знання про ціль з усієї історії бою", () => {
  const rows = [attack(1, "X", 15, true), attack(2, "X", 12, false), ...Array.from({ length: 148 }, (_, i) => filler(i + 3))];

  it("останні 100 подій не містять першої атаки, а знання — містить", async () => {
    const { db } = fakeDb(rows);

    expect((await loadRecentEvents(db, "b1", 100)).some((e) => e.actionType === "attack")).toBe(false);

    const knowledge = summarizeKnowledge(await loadKnowledgeEvents(db, "b1"));

    expect(knowledge.X.ac).toMatchObject({ min: 13, max: 15 });
    expect(knowledge.other).toBeUndefined();
  });

  it("читає лише потрібні колонки й типи, без скасованих", async () => {
    const { db, findMany } = fakeDb([{ ...attack(1, "X", 15, true), cancelledAt: new Date() }, attack(2, "X", 12, false)]);

    const knowledge = summarizeKnowledge(await loadKnowledgeEvents(db, "b1"));

    expect(findMany.mock.calls[0][0]).toMatchObject({ select: { seq: true, round: true, type: true, actorId: true, targets: true, details: true } });
    expect(knowledge.X.ac).toMatchObject({ min: 13, max: undefined });
  });
});
