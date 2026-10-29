import { describe, expect, it, vi } from "vitest";

import { context, goblin, hero } from "./fixtures";

import { moveMutation } from "@/lib/server/battles/mutations/move/move-mutation";
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

  it("ДМ рухає свого юніта у його хід без ліміту швидкості; героя — з лімітом; стіни й зайняте діють", () => {
    const dm = { ...ctx({ participants: [at(goblin, { x: 9, y: 4 }), at(hero, { x: 0, y: 0 })] }), userId: "dm-user", isDM: true };

    const out = moveMutation(dm, { participantId: "gob", to: { x: 0, y: 4 } });

    expect(out.participants[0].battleData).toMatchObject({ position: { x: 0, y: 4 }, movementUsed: 9 });
    expect(() => moveMutation(dm, { participantId: "gob", to: { x: 0, y: 0 } })).toThrow(expect.objectContaining({ code: "action_rejected" }));

    const walled = { ...dm, meta: { ...dm.meta, map: { ...map, blocked: ["8:0", "8:1", "8:2", "8:3", "8:4"] } } };

    expect(() => moveMutation(walled, { participantId: "gob", to: { x: 0, y: 4 } })).toThrow(expect.objectContaining({ code: "action_rejected" }));

    const heroTurn = { ...ctx(), userId: "dm-user", isDM: true };

    expect(() => moveMutation(heroTurn, { participantId: "hero", to: { x: 8, y: 0 } })).toThrow(expect.objectContaining({ code: "action_rejected" }));
  });

  it("NPC-герой, привʼязаний до акаунта ДМ, ходить у свій хід без ліміту, як юніт ДМ", () => {
    const npc = { ...hero, basicInfo: { ...hero.basicInfo, controlledBy: "dm-user" } };

    const dm = { ...ctx({ participants: [at(npc, { x: 0, y: 0 }), at(goblin, { x: 9, y: 4 })] }), userId: "dm-user", isDM: true };

    expect(moveMutation(dm, { participantId: "hero", to: { x: 8, y: 0 } }).participants[0].battleData.position).toEqual({ x: 8, y: 0 });
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

  describe("удар і повернення", () => {
    const maiden = (over: { attacked?: boolean; returned?: boolean } = {}): BattleParticipant => {
      const p = at(hero, { x: 4, y: 0 }, 4);

      return {
        ...p,
        actionFlags: { ...p.actionFlags, hasUsedAction: over.attacked ?? true },
        battleData: {
          ...p.battleData,
          turnStartPosition: { x: 0, y: 0 },
          ...(over.returned && { returnedThisTurn: true }),
          resolvedAbilities: [
            { id: "sr", name: "Удар і повернення", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "strikeAndReturn" }], key: "unit:t:sr", source: { type: "unit", id: "t", name: "x" } },
          ],
        },
      };
    };

    const back = (m: BattleParticipant) => moveMutation(ctx({ participants: [m, at(goblin, { x: 9, y: 4 })] }), { participantId: "hero", to: { x: 0, y: 0 }, returnToStart: true });

    it("після атаки повертає на стартову клітинку без витрати руху", () => {
      const out = back(maiden());

      expect(out.participants[0].battleData).toMatchObject({ position: { x: 0, y: 0 }, movementUsed: 4, returnedThisTurn: true });
    });

    it("до атаки, вдруге або без вміння — відмова", () => {
      expect(() => back(maiden({ attacked: false }))).toThrow(expect.objectContaining({ code: "action_rejected", message: "Повернення доступне лише після атаки" }));
      expect(() => back(maiden({ returned: true }))).toThrow(expect.objectContaining({ code: "action_rejected" }));
      expect(() => back(at(hero, { x: 4, y: 0 }))).toThrow(expect.objectContaining({ code: "action_rejected" }));
    });

    it("зайняту стартову клітинку не віддає", () => {
      const taken = ctx({ participants: [maiden(), at(goblin, { x: 0, y: 0 })] });

      expect(() => moveMutation(taken, { participantId: "hero", to: { x: 0, y: 0 }, returnToStart: true })).toThrow(
        expect.objectContaining({ code: "action_rejected", message: "Повернутися неможливо: клітинка зайнята" }),
      );
    });
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
          hpChanges: [expect.objectContaining({ participantId: "hero", change: 5 })],
        }),
      ]);
      expect(out.events[0]).toMatchObject({ details: { actionDetails: { hazard: { label: "Вогонь", damageType: "fire", damage: 5 } } } });
    });

    it("юніт ДМ без ліміту руху все одно отримує шкоду від небезпеки", () => {
      const dm = { ...withTerrain({ "0:4": fire }, { participants: [at(goblin, { x: 9, y: 4 }), at(hero, { x: 0, y: 0 })] }), isDM: true };

      const out = moveMutation(dm, { participantId: "gob", to: { x: 0, y: 4 } });

      expect(out.participants[0].combatStats.currentHp).toBe(goblin.combatStats.currentHp - 5);
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
      expect(out.events[0]).toMatchObject({ details: { actionDetails: { hazard: { label: "Кислота", damage: 8 } } } });
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

  describe("атаки при відході (5e)", () => {
    const sword = { id: "sw", name: "Меч", type: "melee", attackBonus: 5, damageDice: "1d6", damageType: "slashing" } as BattleParticipant["battleData"]["attacks"][number];

    const foe = { ...at(goblin, { x: 0, y: 1 }), battleData: { ...at(goblin, { x: 0, y: 1 }).battleData, attacks: [sword] } };

    const withRules = (actions: Partial<{ enabled: boolean; opportunityAttacks: boolean }>, hp?: number) => {
      const h = at(hero, { x: 1, y: 0 });

      const base = ctx({ participants: [hp ? { ...h, combatStats: { ...h.combatStats, currentHp: hp } } : h, foe] });

      return { ...base, rng: () => 0.99, meta: { ...base.meta, rules: { ...base.meta.rules, actions: { ...base.meta.rules.actions, ...actions } } } };
    };

    it("увімкнено — атака, подія в журналі, витрачена реакція", () => {
      const out = moveMutation(withRules({ enabled: true, opportunityAttacks: true }), { participantId: "hero", to: { x: 4, y: 0 } });

      expect(out.events.some((e) => e.type === "retaliation" && e.resultText?.startsWith("Атака можливості: Гоблін"))).toBe(true);
      expect(out.events.some((e) => e.resultText === "⚔ Атака при відході: Гоблін → Тест")).toBe(true);
      expect(out.participants[1].actionFlags.hasUsedReaction).toBe(true);
      expect(out.participants[0].battleData).toMatchObject({ position: { x: 4, y: 0 }, movementUsed: 3 });
    });

    it("падіння від атаки зупиняє рух на клітинці виходу", () => {
      const out = moveMutation(withRules({ enabled: true, opportunityAttacks: true }, 1), { participantId: "hero", to: { x: 4, y: 0 } });

      expect(out.participants[0].battleData).toMatchObject({ position: { x: 1, y: 0 }, movementUsed: 0 });
    });

    it("перший ворог збиває мувера — другий не атакує, реакція друга лишається", () => {
      const sword2 = foe.battleData.attacks;

      const place = (p: BattleParticipant, id: string, position: GridPoint) => ({ ...p, basicInfo: { ...p.basicInfo, id, name: id }, battleData: { ...p.battleData, position, attacks: sword2 } });

      const first = place(goblin, "gob1", { x: 3, y: 1 });

      const second = place(goblin, "gob2", { x: 3, y: 3 });

      const h = at(hero, { x: 1, y: 2 });

      const base = ctx({ participants: [{ ...h, combatStats: { ...h.combatStats, currentHp: 1 } }, first, second] });

      const withOa = { ...base, rng: () => 0.99, meta: { ...base.meta, rules: { ...base.meta.rules, actions: { ...base.meta.rules.actions, enabled: true, opportunityAttacks: true } } } };

      const out = moveMutation(withOa, { participantId: "hero", to: { x: 6, y: 2 } });

      const [mover, ...foes] = out.participants;

      const stop = mover.battleData.position!;

      expect(mover.combatStats.currentHp).toBe(0);
      expect(foes.filter((f) => f.actionFlags.hasUsedReaction)).toHaveLength(1);
      expect(stop).not.toEqual({ x: 6, y: 2 });
      expect(mover.battleData.movementUsed).toBe(Math.max(Math.abs(stop.x - 1), Math.abs(stop.y - 2)));
      expect(out.events.filter((e) => e.type === "retaliation")).toHaveLength(1);
    });

    it("вимкнено або opportunityAttacks: false — без атак і без rng", () => {
      const rng = vi.fn(() => 0.99);

      for (const actions of [{ enabled: false }, { enabled: true, opportunityAttacks: false }]) {
        const out = moveMutation({ ...withRules(actions), rng }, { participantId: "hero", to: { x: 4, y: 0 } });

        expect(out.events).toEqual([]);
        expect(out.participants[1].actionFlags.hasUsedReaction).toBe(false);
      }

      expect(rng).not.toHaveBeenCalled();
    });

    it("розстановка ДМ — без атак", () => {
      const out = moveMutation({ ...withRules({ enabled: true, opportunityAttacks: true }), isDM: true }, { participantId: "hero", to: { x: 4, y: 0 }, free: true });

      expect(out.events).toEqual([]);
    });
  });
});

describe("зони заклинань", () => {
  const cells = Object.fromEntries(["3:0", "4:0", "5:0", "3:1", "4:1", "5:1", "3:2", "4:2", "5:2"].map((k) => [k, { kind: "hazard" as const, zoneId: "z1", difficult: true as const, untilRound: 9 }]));

  const zoned = (dc: number): BattleMapConfig => ({
    ...map,
    terrain: cells,
    spellZones: { z1: { casterId: goblin.basicInfo.id, spellId: "s", spellName: "Хмара", dc, side: "enemies", centre: { x: 4, y: 1 }, triggers: { onExit: { save: { ability: "strength" }, effects: [], pull: "centre" } }, untilRound: 9 } },
  });

  const run = (dc: number) => {
    const base = ctx({ participants: [at(hero, { x: 4, y: 1 }), at(goblin, { x: 9, y: 4 })] });

    return moveMutation({ ...base, rng: () => 0, meta: { ...base.meta, map: zoned(dc) } }, { participantId: "hero", to: { x: 8, y: 1 } });
  };

  it("невдалий рятівний при виході: мувер повертається до центру й втрачає решту руху", () => {
    const out = run(99);

    expect(out.participants[0].battleData.position).toEqual({ x: 4, y: 1 });
    expect(out.events.map((e) => e.resultText).join(" ")).toContain("тягне");
  });

  it("успіх (низька СК) — мувер виходить із зони", () => {
    const out = run(1);

    expect(out.participants[0].battleData.position).toEqual({ x: 8, y: 1 });
  });
});


describe("аура на учаснику", () => {
  const anchored = (): BattleParticipant => ({
    ...at(goblin, { x: 9, y: 4 }),
    battleData: {
      ...goblin.battleData,
      position: { x: 9, y: 4 },
      activeEffects: [{ id: "a1", name: "Аура", type: "buff", duration: 5, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [], anchoredZone: { casterId: goblin.basicInfo.id, spellId: "s", spellName: "Аура", dc: 99, radiusFeet: 10, side: "all", onEnter: { effects: [{ kind: "dealDamage", amount: 4, damageType: "psychic", target: "eventTarget" }] } } }],
    },
  });

  it("рух героя в радіус носія без spellZones спрацьовує вхід", () => {
    const base = ctx({ participants: [at(hero, { x: 4, y: 4 }), anchored()] });

    const out = moveMutation({ ...base, rng: () => 0 }, { participantId: "hero", to: { x: 7, y: 4 } });

    expect(out.participants[0].combatStats.currentHp).toBe(hero.combatStats.currentHp - 4);
  });
});
