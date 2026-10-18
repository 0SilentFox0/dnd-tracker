import { describe, expect, it } from "vitest";

import { context, goblin, hero } from "./fixtures";

import { moveMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/move/move-mutation";
import { BattleAccessError } from "@/lib/utils/battle/store";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const map: BattleMapConfig = { cols: 10, rows: 5, background: null, opacity: 0.3 };

const at = (p: BattleParticipant, position: GridPoint, movementUsed?: number): BattleParticipant => ({
  ...p,
  combatStats: { ...p.combatStats, speed: 30 },
  battleData: { ...p.battleData, position, ...(movementUsed !== undefined && { movementUsed }) },
});

const ctx = (over: Parameters<typeof context>[0] = {}) => {
  const base = context({ participants: [at(hero, { x: 0, y: 0 }), at(goblin, { x: 9, y: 4 })], ...over });

  return { ...base, meta: { ...base.meta, map } };
};

describe("move mutation", () => {
  it("рухає у свій хід і рахує витрачені клітинки, без подій журналу", () => {
    const out = moveMutation(ctx(), { participantId: "hero", to: { x: 3, y: 2 } });

    expect(out.participants[0].battleData).toMatchObject({ position: { x: 3, y: 2 }, movementUsed: 3 });
    expect(out.events).toEqual([]);
  });

  it("далі за бюджет або на зайняту клітинку — відмова", () => {
    expect(() => moveMutation(ctx(), { participantId: "hero", to: { x: 7, y: 0 } })).toThrow(expect.objectContaining({ code: "action_rejected" }));

    const tired = ctx({ participants: [at(hero, { x: 0, y: 0 }, 5), at(goblin, { x: 9, y: 4 })] });

    expect(() => moveMutation(tired, { participantId: "hero", to: { x: 2, y: 0 } })).toThrow(expect.objectContaining({ code: "action_rejected" }));
  });

  it("гравець не рухає чужого учасника; ДМ ставить будь-кого вільно, не витрачаючи рух", () => {
    expect(() => moveMutation(ctx(), { participantId: "gob", to: { x: 8, y: 4 } })).toThrow(BattleAccessError);

    const out = moveMutation({ ...ctx(), isDM: true }, { participantId: "gob", to: { x: 1, y: 0 } });

    expect(out.participants[1].battleData.position).toEqual({ x: 1, y: 0 });
    expect(out.participants[1].battleData.movementUsed).toBeUndefined();
  });

  it("ДМ із free ставить учасника в його хід без бюджету; гравець із free — звичайні правила", () => {
    const far = { participantId: "hero", to: { x: 8, y: 0 }, free: true };

    const out = moveMutation({ ...ctx(), isDM: true }, far);

    expect(out.participants[0].battleData.position).toEqual({ x: 8, y: 0 });
    expect(out.participants[0].battleData.movementUsed).toBeUndefined();
    expect(() => moveMutation(ctx(), far)).toThrow(expect.objectContaining({ code: "action_rejected" }));
  });

  it("учасник без позиції спершу розставляється, потім рухається", () => {
    const loose = { ...hero, combatStats: { ...hero.combatStats, speed: 30 } };

    const out = moveMutation(ctx({ participants: [loose, at(goblin, { x: 9, y: 4 })] }), { participantId: "hero", to: { x: 2, y: 2 } });

    expect(out.participants[0].battleData.position).toEqual({ x: 2, y: 2 });
    expect(out.participants[0].battleData.movementUsed).toBeGreaterThan(0);
  });

  it("неігрова клітинка — відмова і для звичайного, і для вільного руху", () => {
    const base = ctx();

    const walled = { ...base, meta: { ...base.meta, map: { ...map, blocked: ["2:0"] } } };

    expect(() => moveMutation(walled, { participantId: "hero", to: { x: 2, y: 0 } })).toThrow(expect.objectContaining({ code: "action_rejected" }));
    expect(() => moveMutation({ ...walled, isDM: true }, { participantId: "hero", to: { x: 2, y: 0 }, free: true })).toThrow(
      expect.objectContaining({ code: "action_rejected" }),
    );
  });

  it("без карти — відмова", () => {
    expect(() => moveMutation(context(), { participantId: "hero", to: { x: 1, y: 0 } })).toThrow(expect.objectContaining({ code: "action_rejected" }));
  });
});
