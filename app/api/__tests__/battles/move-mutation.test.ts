import { describe, expect, it } from "vitest";

import { context, goblin, hero } from "./fixtures";

import { moveMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/move/move-mutation";
import { BattleAccessError } from "@/lib/utils/battle/store";
import type { BattleMapConfig, BattleParticipant, GridPoint, TerrainCell } from "@/types/battle";

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

  describe("небезпека", () => {
    const fire: TerrainCell = { kind: "hazard", label: "Вогонь", damage: { amount: 5, type: "fire" } };

    const withTerrain = (terrain: Record<string, TerrainCell>, over: Parameters<typeof context>[0] = {}, blocked?: string[]) => {
      const base = ctx(over);

      return { ...base, rng: () => 0, meta: { ...base.meta, map: { ...map, terrain, ...(blocked && { blocked }) } } };
    };

    it("вхід у небезпеку — шкода і подія журналу з hpChanges", () => {
      const out = moveMutation(withTerrain({ "2:0": fire }), { participantId: "hero", to: { x: 2, y: 0 } });

      expect(out.participants[0].combatStats.currentHp).toBe(hero.combatStats.currentHp - 5);
      expect(out.participants[0].battleData.hazardHitRound).toBe(1);
      expect(out.events).toEqual([
        expect.objectContaining({
          type: "ability",
          actorId: "hero",
          resultText: "Тест: 5 fire шкоди від «Вогонь»",
          hpChanges: [expect.objectContaining({ participantId: "hero", change: -5 })],
        }),
      ]);
    });

    it("вихід і повторний вхід у тому самому раунді — без шкоди", () => {
      const first = withTerrain({ "1:0": fire });

      const entered = moveMutation(first, { participantId: "hero", to: { x: 1, y: 0 } });

      const out = moveMutation({ ...first, participants: entered.participants }, { participantId: "hero", to: { x: 0, y: 0 } });

      const back = moveMutation({ ...first, participants: out.participants }, { participantId: "hero", to: { x: 1, y: 0 } });

      expect(entered.events).toHaveLength(1);
      expect(back.events).toEqual([]);
      expect(back.participants[0].combatStats.currentHp).toBe(entered.participants[0].combatStats.currentHp);
    });

    it("прохід повз з обходом тієї ж вартості — без шкоди; без обходу — шкода", () => {
      expect(moveMutation(withTerrain({ "1:0": fire }), { participantId: "hero", to: { x: 2, y: 0 } }).events).toEqual([]);

      const narrow = withTerrain({ "1:1": fire }, { participants: [at(hero, { x: 0, y: 1 }), at(goblin, { x: 9, y: 4 })] }, ["1:0", "1:2"]);

      expect(moveMutation(narrow, { participantId: "hero", to: { x: 2, y: 1 } }).events).toHaveLength(1);
    });

    it("велика істота на двох небезпечних клітинках — одна шкода найсильнішої", () => {
      const big = { ...at(hero, { x: 0, y: 0 }), combatStats: { ...at(hero, { x: 0, y: 0 }).combatStats, gridSize: 2 } };

      const acid: TerrainCell = { kind: "hazard", label: "Кислота", damage: { amount: 8, type: "acid" } };

      const out = moveMutation(withTerrain({ "3:0": fire, "3:1": acid }, { participants: [big, at(goblin, { x: 9, y: 4 })] }), { participantId: "hero", to: { x: 2, y: 0 } });

      expect(out.events).toHaveLength(1);
      expect(out.participants[0].combatStats.currentHp).toBe(big.combatStats.currentHp - 8);
    });

    it("смертельна шкода валить учасника", () => {
      const weak = { ...at(hero, { x: 0, y: 0 }), combatStats: { ...at(hero, { x: 0, y: 0 }).combatStats, currentHp: 3 } };

      const out = moveMutation(withTerrain({ "1:0": fire }, { participants: [weak, at(goblin, { x: 9, y: 4 })] }), { participantId: "hero", to: { x: 1, y: 0 } });

      expect(out.participants[0].combatStats.status).toBe("unconscious");
    });

    it("розстановка ДМ і небезпека без damage — без шкоди", () => {
      const placed = moveMutation({ ...withTerrain({ "8:0": fire }), isDM: true }, { participantId: "hero", to: { x: 8, y: 0 }, free: true });

      expect(placed.events).toEqual([]);
      expect(placed.participants[0].combatStats.currentHp).toBe(hero.combatStats.currentHp);

      const plain = moveMutation(withTerrain({ "1:0": { kind: "hazard", label: "Калюжа" } }), { participantId: "hero", to: { x: 1, y: 0 } });

      expect(plain.events).toEqual([]);
    });
  });
});
