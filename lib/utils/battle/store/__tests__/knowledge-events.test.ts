import type { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { loadKnowledgeEvents, loadRecentEvents } from "@/lib/utils/battle/store/history";
import type { BattleDb } from "@/lib/utils/battle/store/load-battle";
import { KNOWLEDGE_EVENT_TYPES, summarizeKnowledge } from "@/lib/utils/battle/view/knowledge";

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
  const findMany = vi.fn(async (args: { where: { cancelledAt: null }; orderBy: { seq: "asc" | "desc" }; take?: number }) => {
    const list = rows.filter((r) => r.cancelledAt === null).sort((a, b) => (args.orderBy.seq === "asc" ? a.seq - b.seq : b.seq - a.seq));

    return args.take ? list.slice(0, args.take) : list;
  });

  const queryRaw = vi.fn(async (query: Prisma.Sql) =>
    rows
      .filter((r) => r.cancelledAt === null && query.values.includes(r.type))
      .sort((a, b) => a.seq - b.seq)
      .map(({ seq, round, type, targets, details }) => ({ seq, round, type, targets, details })),
  );

  return { db: { battleEvent: { findMany }, $queryRaw: queryRaw } as unknown as BattleDb, findMany, queryRaw };
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

  it("читає лише потрібні шляхи details, параметризовано, без скасованих", async () => {
    const { db, queryRaw } = fakeDb([{ ...attack(1, "X", 15, true), cancelledAt: new Date() }, attack(2, "X", 12, false)]);

    const knowledge = summarizeKnowledge(await loadKnowledgeEvents(db, "b1"));

    const query = queryRaw.mock.calls[0][0];

    const sql = query.sql.replace(/\s+/g, " ");

    expect(sql).not.toMatch(/SELECT[^]*\bdetails\b\s*,/);
    expect(sql).toContain("'actionDetails'");
    expect(sql).toContain("'damageSteps'");
    expect(sql).toContain('"cancelledAt" IS NULL');
    expect(query.values).toEqual(expect.arrayContaining(["b1", ...KNOWLEDGE_EVENT_TYPES]));
    expect(knowledge.X.ac).toMatchObject({ min: 13, max: undefined });
  });
});
