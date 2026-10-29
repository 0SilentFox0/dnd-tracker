import { describe, expect, it } from "vitest";

import { ABILITIES, byId, hp, MAP, percentOfAttack, perform,unit } from "./fixtures";

import { ParticipantSide } from "@/lib/constants/battle";
import { isTargetable } from "@/lib/utils/abilities/engine/core/participants";
import { resolveTargetIds } from "@/lib/utils/abilities/engine/core/targets";
import { withinLimits } from "@/lib/utils/abilities/engine/core/usage";
import { grantPassive } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { cellKey, cellsOf } from "@/lib/utils/battle/grid";
import { textsOf } from "@/lib/utils/battle/log/__tests__/event-text";
import { processStartOfTurn } from "@/lib/utils/battle/turn/start-end";
import { checkVictoryConditions } from "@/lib/utils/battle/turn/victory";
import { assertAbilityTargets } from "@/lib/utils/battle/validation/ability-targets";
import type { BattleParticipant } from "@/types/battle";

const griffin = (at?: { x: number; y: number }) => unit("g", { side: ParticipantSide.ALLY, at, size: 2, abilities: [ABILITIES.dive] });

const land = (ps: BattleParticipant[], map = MAP) => processStartOfTurn(byId(ps, "g"), 2, ps, () => 0, map);

describe("Пікірування", () => {
  it("злітає: без позиції, у повітрі, вороги не можуть його обрати", () => {
    const enemy = unit("e", { at: { x: 10, y: 2 } });

    const { participants: ps } = perform([griffin({ x: 2, y: 2 }), enemy], "dive", { map: MAP, targetCell: { x: 10, y: 2 } });

    const g = byId(ps, "g");

    expect(g.battleData.position).toBeUndefined();
    expect(g.battleData.airborne).toEqual({ landAt: { x: 10, y: 2 }, since: 1, percent: 200, name: "Пікірування" });
    expect(isTargetable(g)).toBe(false);
    expect(resolveTargetIds("allEnemies", "e", { type: "turnStart", actorId: "e" }, ps)).not.toContain("g");
    expect(() => assertAbilityTargets({ ...ABILITIES.dive, effects: [{ kind: "dealDamage", amount: 1, target: "eventTarget" }] }, ps, ["g"], { owner: byId(ps, "e") })).toThrow();
  });

  it("посадка бере назву й відсоток зі збереженого стану, а не з умінь", () => {
    const enemy = unit("e", { at: { x: 10, y: 2 } });

    const { participants: up } = perform([griffin({ x: 2, y: 2 }), enemy], "dive", { map: MAP, targetCell: { x: 10, y: 2 } });

    const stripped = up.map((p) => (p.basicInfo.id === "g" ? { ...p, battleData: { ...p.battleData, resolvedAbilities: [] } } : p));

    const r = land(stripped);

    expect(hp(r.participants, "e")).toBeLessThan(200);
    expect(textsOf(r.abilityMessages).join(" ")).toContain("Пікірування");
  });

  it("на початку наступного ходу падає на ціль: ×2 середньої шкоди з урахуванням опору", () => {
    const enemy = grantPassive(unit("e", { at: { x: 10, y: 2 } }), [{ kind: "flag", flag: "resistance", damageType: "slashing", percent: 50 }]);

    const { participants: up } = perform([griffin({ x: 2, y: 2 }), enemy], "dive", { map: MAP, targetCell: { x: 10, y: 2 } });

    const r = land(up);

    const g = byId(r.participants, "g");

    expect(hp(r.participants, "e")).toBe(200 - Math.floor(percentOfAttack(g, 200) / 2));
    expect(g.battleData.airborne).toBeUndefined();
    expect(g.actionFlags.hasUsedAction).toBe(true);

    const enemyCells = new Set(cellsOf(byId(r.participants, "e")).map(cellKey));

    expect(g.battleData.position).toBeDefined();
    expect(cellsOf(g).some((c) => enemyCells.has(cellKey(c)))).toBe(false);
  });

  it("клітинку зайняв союзник — сідає на найближчу вільну, союзник цілий", () => {
    const ally = unit("a", { side: ParticipantSide.ALLY, at: { x: 10, y: 10 } });

    const { participants: up } = perform([griffin({ x: 2, y: 2 }), ally], "dive", { map: MAP, targetCell: { x: 10, y: 10 } });

    const r = land(up);

    const g = byId(r.participants, "g");

    expect(hp(r.participants, "a")).toBe(200);

    const pos = g.battleData.position as { x: number; y: number };

    expect(Math.max(Math.abs(pos.x - 10), Math.abs(pos.y - 10))).toBeLessThanOrEqual(2);
    expect(cellsOf(g).map(cellKey)).not.toContain("10:10");
  });

  it("порожня клітинка — удар у порожнечу, сідає туди", () => {
    const { participants: up } = perform([griffin({ x: 2, y: 2 }), unit("e", { at: { x: 15, y: 15 } })], "dive", { map: MAP, targetCell: { x: 10, y: 10 } });

    const r = land(up);

    expect(textsOf(r.abilityMessages).join(" ")).toContain("удар у порожнечу");
    expect(byId(r.participants, "g").battleData.position).toEqual({ x: 10, y: 10 });
    expect(hp(r.participants, "e")).toBe(200);
  });

  it("без карти бʼє обрану ціль", () => {
    const { participants: up } = perform([griffin(), unit("e")], "dive", { targetIds: ["e"] });

    expect(byId(up, "g").battleData.airborne).toEqual({ targetId: "e", since: 1, percent: 200, name: "Пікірування" });

    const r = land(up, undefined);

    expect(hp(r.participants, "e")).toBe(200 - percentOfAttack(byId(r.participants, "g"), 200));
  });

  it("останній живий на своєму боці в повітрі — бій не виграно", () => {
    const { participants: up } = perform([griffin({ x: 2, y: 2 }), unit("e", { at: { x: 10, y: 2 } })], "dive", { map: MAP, targetCell: { x: 10, y: 2 } });

    expect(checkVictoryConditions(up).result).toBeNull();
  });

  it("перезарядка: наступного раунду знову не можна", () => {
    const { participants: up } = perform([griffin({ x: 2, y: 2 }), unit("e")], "dive", { map: MAP, targetCell: { x: 10, y: 2 } });

    expect(withinLimits(byId(up, "g"), ABILITIES.dive, 2)).toBe(false);
  });
});
