import { describe, expect, it } from "vitest";

import { diffParticipants } from "@/lib/utils/battle/store/diff-participants";
import { splitParticipant } from "@/lib/utils/battle/store/split-participant";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";

const at = (i: number) => ({ orderIndex: i, isPending: false });

const a = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "a" } });

const b = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "b" } });

describe("diffParticipants", () => {
  it("нічого не змінилось — порожній дифф", () => {
    const before = [splitParticipant(a, at(0)), splitParticipant(b, at(1))];

    const after = [splitParticipant(a, at(0)), splitParticipant(b, at(1))];

    expect(diffParticipants(before, after)).toEqual({ created: [], updated: [], removed: [] });
  });

  it("змінилось HP одного — один update лише колонок", () => {
    const before = [splitParticipant(a, at(0)), splitParticipant(b, at(1))];

    const hurt = { ...b, combatStats: { ...b.combatStats, currentHp: 3 } };

    const diff = diffParticipants(before, [splitParticipant(a, at(0)), splitParticipant(hurt, at(1))]);

    expect(diff.updated).toHaveLength(1);
    expect(diff.updated[0]).toMatchObject({ columnsChanged: true, stateChanged: false, snapshotChanged: false });
    expect(diff.updated[0].next.columns.id).toBe("b");
  });

  it("новий ефект — stateChanged", () => {
    const before = [splitParticipant(a, at(0))];

    const poisoned = { ...a, battleData: { ...a.battleData, activeEffects: [{ id: "e" } as never] } };

    const diff = diffParticipants(before, [splitParticipant(poisoned, at(0))]);

    expect(diff.updated[0]).toMatchObject({ columnsChanged: false, stateChanged: true, snapshotChanged: false });
  });

  it("зміна порядку — columnsChanged через orderIndex", () => {
    const before = [splitParticipant(a, at(0)), splitParticipant(b, at(1))];

    const diff = diffParticipants(before, [splitParticipant(b, at(0)), splitParticipant(a, at(1))]);

    expect(diff.updated.map((u) => u.next.columns.id).sort()).toEqual(["a", "b"]);
  });

  it("доданий і видалений", () => {
    const before = [splitParticipant(a, at(0))];

    const diff = diffParticipants(before, [splitParticipant(b, at(0))]);

    expect(diff.created.map((p) => p.columns.id)).toEqual(["b"]);
    expect(diff.removed.map((p) => p.columns.id)).toEqual(["a"]);
  });
});
