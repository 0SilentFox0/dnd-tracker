import { describe, expect, it } from "vitest";

import { context, goblin, hero, participant } from "./fixtures";

import { scaleUnitsMutation } from "@/lib/server/battles/mutations/scale-units/scale-units-mutation";
import type { BattleParticipant } from "@/types/battle";

const withHp = (p: BattleParticipant, maxHp: number, currentHp = maxHp, rest: Partial<BattleParticipant["battleData"]> = {}): BattleParticipant => ({
  ...p,
  combatStats: { ...p.combatStats, maxHp, currentHp },
  battleData: { ...p.battleData, ...rest },
});

const unit = (id: string, side: "ally" | "enemy") => participant(id, { side, sourceType: "unit", controlledBy: "dm" });

describe("scale-units mutation", () => {
  it("підсилює лише живих ворожих юнітів і стакає множники", () => {
    const enemy = withHp(unit("u1", "enemy"), 100, 50, { damageMultiplier: 1.2, hpMultiplier: 1.5 });

    const ally = withHp(unit("u2", "ally"), 100);

    const enemyHero = withHp({ ...goblin, basicInfo: { ...goblin.basicInfo, sourceType: "character" } }, 100);

    const fallen = withHp(unit("u3", "enemy"), 100, 0);

    const dead = { ...fallen, combatStats: { ...fallen.combatStats, status: "dead" as const } };

    const out = scaleUnitsMutation(context({ participants: [hero, enemy, ally, enemyHero, dead] }), { direction: "buff" });

    const byId = (id: string) => out.participants.find((p) => p.basicInfo.id === id) as BattleParticipant;

    expect(byId("u1").combatStats).toMatchObject({ maxHp: 110, currentHp: 55 });
    expect(byId("u1").battleData.damageMultiplier).toBeCloseTo(1.32);
    expect(byId("u1").battleData.hpMultiplier).toBeCloseTo(1.65);
    expect(byId("u2")).toBe(ally);
    expect(byId("gob")).toBe(enemyHero);
    expect(byId("u3")).toBe(dead);
  });

  it("підсилення і послаблення взаємно скасовують множник шкоди", () => {
    const enemy = withHp(unit("u1", "enemy"), 100);

    const buffed = scaleUnitsMutation(context({ participants: [hero, enemy] }), { direction: "buff" });

    const back = scaleUnitsMutation(context({ participants: buffed.participants }), { direction: "debuff" });

    const u = back.participants.find((p) => p.basicInfo.id === "u1") as BattleParticipant;

    expect(u.battleData.damageMultiplier).toBeCloseTo(1);
    expect(u.combatStats.maxHp).toBe(100);
  });

  it("немає ворожих юнітів — помилка", () => {
    expect(() => scaleUnitsMutation(context({ participants: [hero] }), { direction: "buff" })).toThrow();
  });
});
