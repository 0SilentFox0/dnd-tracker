import { describe, expect, it, vi } from "vitest";

import { context, goblin, hero, participant } from "./fixtures";

import { ParticipantSide } from "@/lib/constants/battle";
import { createAddParticipantMutation } from "@/lib/server/battles/mutations/add-participant/add-participant-mutation";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { at, mazeMap, withMap } from "@/lib/utils/battle/modes/maze/__tests__/fixtures";
import { toReserve } from "@/lib/utils/battle/participant/reserve";
import { parseRules } from "@/lib/utils/rules/schema";
import type { BattleParticipant } from "@/types/battle";

function deps(over = {}) {
  return {
    loadCharacter: vi.fn(async () => ({ id: "ch1", campaignId: "c1" }) as never),
    loadUnit: vi.fn(async () => ({ id: "u1", campaignId: "c1" }) as never),
    fromCharacter: vi.fn(async () => participant("new-ch")),
    fromUnit: vi.fn(async (_u: unknown, _b: string, _s: unknown, n: number) => participant(`new-u${n}`)),
    ...over,
  };
}

describe("add-participant mutation", () => {
  const withInit = (id: string, initiative: number) => {
    const p = participant(id);

    return { ...p, abilities: { ...p.abilities, initiative, baseInitiative: initiative } };
  };

  it("вставляє юнітів за ініціативою після поточного", async () => {
    const d = deps({ fromUnit: vi.fn(async (_u: unknown, _b: string, _s: unknown, n: number) => withInit(`new-u${n}`, 12)) });

    const out = await createAddParticipantMutation(d)(context({ participants: [withInit("hero", 20), withInit("gob", 5)] }), { sourceId: "u1", type: "unit", side: "enemy", quantity: 2 });

    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["hero", "new-u1", "new-u2", "gob"]);
    expect(out.scene?.turnIndex).toBeUndefined();
    expect(out.events[0].resultText).toContain("DM додав на поле");
  });

  it("місце вже минуло — поточний не змінюється, turnIndex зсувається", async () => {
    const d = deps({ fromCharacter: vi.fn(async () => withInit("fast", 30)) });

    const out = await createAddParticipantMutation(d)(context({ participants: [withInit("hero", 20), withInit("gob", 5)], scene: { ...context().scene, turnIndex: 1 } }), { sourceId: "ch1", type: "character", side: "ally", quantity: 1 });

    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["fast", "hero", "gob"]);
    expect(out.scene?.turnIndex).toBe(2);
  });

  it("героя будують із зафіксованими правилами бою", async () => {
    const rules = parseRules({ morale: { enabled: false } });

    const d = deps();

    await createAddParticipantMutation(d)(context({ meta: { ...context().meta, rules } }), { sourceId: "ch1", type: "character", side: "ally", quantity: 1 });

    expect(d.fromCharacter).toHaveBeenCalledWith(expect.anything(), "b1", "ally", undefined, undefined, { rules });
  });

  it("reserved — у резерв, черга не змінюється", async () => {
    const out = await createAddParticipantMutation(deps())(context(), { sourceId: "u1", type: "unit", side: "enemy", quantity: 2, reserved: true });

    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["hero", "gob"]);
    expect(out.pending.map((p) => [p.basicInfo.id, p.battleData.reserved])).toEqual([["new-u1", true], ["new-u2", true]]);
    expect(out.events).toEqual([]);
  });

  it("новачок не обганяє щойно розкритого після поточного", async () => {
    const revealed = { ...withInit("rev", 5), battleData: { ...participant("rev").battleData, revealPending: true } };

    const d = deps({ fromUnit: vi.fn(async () => withInit("x", 8)) });

    const out = await createAddParticipantMutation(d)(
      context({ participants: [withInit("a", 20), withInit("b", 15), revealed, withInit("c", 10)], scene: { ...context().scene, turnIndex: 1 } }),
      { sourceId: "u1", type: "unit", side: "enemy", quantity: 1 },
    );

    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["a", "b", "rev", "c", "x"]);
  });

  it("позиція рахується після запечених аур ініціативи", async () => {
    const aura = resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "initiative", flat: 5, target: "allAllies" }] });

    const source = { ...withInit("src", 8), battleData: { ...participant("src").battleData, resolvedAbilities: [aura] } };

    const d = deps({ fromCharacter: vi.fn(async () => withInit("new", 12)) });

    const out = await createAddParticipantMutation(d)(
      context({ participants: [withInit("hero", 20), { ...withInit("gob", 15), basicInfo: { ...goblin.basicInfo, id: "gob" } }, source] }),
      { sourceId: "ch1", type: "character", side: "ally", quantity: 1 },
    );

    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["hero", "new", "gob", "src"]);

    const added = out.participants.find((p) => p.basicInfo.id === "new");

    expect(added?.abilities.initiative).toBe(17);
    expect(added?.abilities.baseInitiative).toBe(17);
  });

  it("порядок після розкриття не монотонний — новачок іде за ініціативою серед тих, хто ще ходить", async () => {
    const acted = withInit("rev", 5);

    const d = deps({ fromUnit: vi.fn(async () => withInit("x", 8)) });

    const out = await createAddParticipantMutation(d)(
      context({ participants: [withInit("a", 20), withInit("b", 15), acted, withInit("c", 10)], scene: { ...context().scene, turnIndex: 3 } }),
      { sourceId: "u1", type: "unit", side: "enemy", quantity: 1 },
    );

    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["a", "b", "rev", "c", "x"]);
    expect(out.scene?.turnIndex).toBeUndefined();
  });

  it("персонаж іншої кампанії — 404", async () => {
    const d = deps({ loadCharacter: vi.fn(async () => ({ id: "ch1", campaignId: "other" })) });

    await expect(
      createAddParticipantMutation(d)(context({ participants: [hero, goblin] }), { sourceId: "ch1", type: "character", side: "ally", quantity: 1 }),
    ).rejects.toMatchObject({ status: 404 });
  });

  describe("ворог-юніт посеред бою", () => {
    const built = (id: string) => participant(id, { sourceId: "u1", side: ParticipantSide.ENEMY }, { combatStats: { ...goblin.combatStats, maxHp: 10, currentHp: 10 } });

    const scaledWolf = participant("wolf-0", { sourceId: "u1", side: ParticipantSide.ENEMY }, {
      combatStats: { ...goblin.combatStats, maxHp: 15, currentHp: 4 },
      battleData: { ...goblin.battleData, hpMultiplier: 1.5, damageMultiplier: 1.2 },
    });

    const run = (participants: BattleParticipant[], side: "enemy" | "ally" = "enemy") =>
      createAddParticipantMutation(deps({ fromUnit: vi.fn(async (_u: unknown, _b: string, _s: unknown, n: number) => built(`new-u${n}`)) }))(
        context({ participants }),
        { sourceId: "u1", type: "unit", side, quantity: 2 },
      );

    it("копіює множники наявного учасника з тим самим sourceId і масштабує HP", async () => {
      const out = await run([hero, scaledWolf]);

      const added = out.participants.filter((p) => p.basicInfo.id.startsWith("new-u"));

      expect(added).toHaveLength(2);

      for (const p of added) {
        expect(p.battleData.hpMultiplier).toBe(1.5);
        expect(p.battleData.damageMultiplier).toBe(1.2);
        expect(p.combatStats.maxHp).toBe(15);
        expect(p.combatStats.currentHp).toBe(15);
      }
    });

    it("двійник у резерві теж дає множники", async () => {
      const out = await createAddParticipantMutation(deps({ fromUnit: vi.fn(async (_u: unknown, _b: string, _s: unknown, n: number) => built(`new-u${n}`)) }))(
        context({ participants: [hero], pending: [toReserve(scaledWolf)] }),
        { sourceId: "u1", type: "unit", side: "enemy", quantity: 1 },
      );

      const added = out.participants.find((p) => p.basicInfo.id === "new-u1");

      expect(added?.battleData.damageMultiplier).toBe(1.2);
      expect(added?.combatStats.maxHp).toBe(15);
    });

    it("без такого учасника лишається ×1", async () => {
      const out = await run([hero, goblin]);

      const added = out.participants.filter((p) => p.basicInfo.id.startsWith("new-u"));

      expect(added.every((p) => p.battleData.damageMultiplier === undefined && p.combatStats.maxHp === 10)).toBe(true);
    });

    it("союзні юніти не масштабуються", async () => {
      const out = await run([hero, scaledWolf], "ally");

      expect(out.participants.find((p) => p.basicInfo.id === "new-u1")?.combatStats.maxHp).toBe(10);
    });
  });
});

describe("add-participant у лабіринті", () => {
  const mazeCtx = () => withMap(context({ isDM: true, participants: [at(hero, { x: 0, y: 2 }), at(goblin, { x: 5, y: 5 }, { dormant: true })] }), mazeMap({ exit: { x: 5, y: 0 } }, 6));

  it("ворог сплячий на вказаній клітинці; на вихід — відмова", async () => {
    const add = createAddParticipantMutation(deps({ fromUnit: vi.fn(async (_u: unknown, _b: string, side: ParticipantSide, n: number) => participant(`new-u${n}`, { side })) }));

    const out = await add(mazeCtx(), { sourceId: "u1", type: "unit", side: "enemy", quantity: 2, position: { x: 3, y: 3 } });

    const added = out.participants.filter((p) => p.basicInfo.id.startsWith("new-u"));

    expect(added.map((p) => p.battleData.dormant)).toEqual([true, true]);
    expect(added[0].battleData.position).toEqual({ x: 3, y: 3 });

    await expect(add(mazeCtx(), { sourceId: "u1", type: "unit", side: "enemy", quantity: 1, position: { x: 5, y: 0 } })).rejects.toMatchObject({ code: "action_rejected" });
  });
});
