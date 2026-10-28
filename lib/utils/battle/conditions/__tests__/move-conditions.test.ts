import { describe, expect, it } from "vitest";

import { context, goblin, hero } from "@/lib/server/battles/__tests__/mutations/fixtures";
import { moveMutation } from "@/lib/server/battles/mutations/move/move-mutation";
import { applyCondition5e } from "@/lib/utils/battle/conditions";
import { frightenedBlocksMove } from "@/lib/utils/battle/grid";
import type { BattleParticipant } from "@/types/battle";

const map = { cols: 10, rows: 5, background: null, opacity: 0.3 };

const at = (p: BattleParticipant, x: number, y: number): BattleParticipant => ({
  ...p,
  combatStats: { ...p.combatStats, speed: 30 },
  battleData: { ...p.battleData, position: { x, y } },
});

const scared = (): BattleParticipant[] =>
  applyCondition5e([at(hero, 4, 2), at(goblin, 8, 2)], "hero", {
    key: "frightened",
    rounds: 5,
    source: { participantId: "gob", abilityId: "x", abilityName: "X" } as never,
    sourceName: "X",
    timedKey: "t",
    round: 1,
  }).participants;

describe("наляканий і рух", () => {
  it("наближення до джерела заблоковано, та сама відстань і далі — ні", () => {
    const ps = scared();

    const mover = ps[0];

    expect(frightenedBlocksMove(map, ps, mover, { x: 5, y: 2 })).toBe(true);
    expect(frightenedBlocksMove(map, ps, mover, { x: 4, y: 1 })).toBe(false);
    expect(frightenedBlocksMove(map, ps, mover, { x: 2, y: 2 })).toBe(false);
  });

  it("мертве джерело не блокує", () => {
    const ps = scared().map((p) => (p.basicInfo.id === "gob" ? { ...p, combatStats: { ...p.combatStats, status: "dead" } } : p)) as BattleParticipant[];

    expect(frightenedBlocksMove(map, ps, ps[0], { x: 5, y: 2 })).toBe(false);
  });

  it("moveMutation відхиляє наближення", () => {
    const base = context({ participants: scared() });

    const ctx = { ...base, meta: { ...base.meta, map } };

    expect(() => moveMutation(ctx, { participantId: "hero", to: { x: 5, y: 2 } })).toThrow("Наляканий");
    expect(() => moveMutation(ctx, { participantId: "hero", to: { x: 3, y: 2 } })).not.toThrow();
  });
});
