import { describe, expect, it } from "vitest";

import { ABILITIES, byId, hp, MAP, percentOfAttack, perform,unit } from "./fixtures";

import { ParticipantSide } from "@/lib/constants/battle";
import { withinLimits } from "@/lib/utils/abilities/engine/core/usage";
import { grantPassive } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { textsOf } from "@/lib/utils/battle/log/__tests__/event-text";
import type { GridPoint } from "@/types/battle";

const demon = (at?: GridPoint) => unit("g", { side: ParticipantSide.ALLY, at, abilities: [ABILITIES.fireBurst] });

const field = () => [
  demon({ x: 5, y: 5 }),
  unit("e1", { at: { x: 6, y: 5 } }),
  unit("e2", { at: { x: 4, y: 4 } }),
  unit("far", { at: { x: 9, y: 9 } }),
  unit("a1", { side: ParticipantSide.ALLY, at: { x: 5, y: 6 } }),
];

const FAIL = () => 0;

const SUCCESS = () => 0.99;

describe("Вогняний вибух", () => {
  it("лише сусідні вороги; союзник цілий", () => {
    const { participants: ps } = perform(field(), "fireBurst", { map: MAP, rng: FAIL });

    const dmg = percentOfAttack(byId(ps, "g"), 50);

    expect(dmg).toBeGreaterThan(0);
    expect(hp(ps, "e1")).toBe(200 - dmg);
    expect(hp(ps, "e2")).toBe(200 - dmg);
    expect(hp(ps, "far")).toBe(200);
    expect(hp(ps, "a1")).toBe(200);
  });

  it("успішний рятівний кидок Спритності — половина", () => {
    const { participants: ps } = perform(field(), "fireBurst", { map: MAP, rng: SUCCESS });

    expect(hp(ps, "e1")).toBe(200 - Math.floor(percentOfAttack(byId(ps, "g"), 50) / 2));
  });

  it("імунітет до вогню — 0", () => {
    const [g, e1, ...rest] = field();

    const { participants: ps } = perform([g, grantPassive(e1, [{ kind: "flag", flag: "resistance", damageType: "fire", percent: 100 }]), ...rest], "fireBurst", { map: MAP, rng: FAIL });

    expect(hp(ps, "e1")).toBe(200);
  });

  it("без карти — обрані вороги", () => {
    const { participants: ps } = perform([demon(), unit("e1"), unit("e2")], "fireBurst", { targetIds: ["e1"], rng: FAIL });

    expect(hp(ps, "e1")).toBe(200 - percentOfAttack(byId(ps, "g"), 50));
    expect(hp(ps, "e2")).toBe(200);
  });

  it("перезарядка 2 раунди", () => {
    const { participants: ps } = perform(field(), "fireBurst", { map: MAP, rng: FAIL });

    expect(withinLimits(byId(ps, "g"), ABILITIES.fireBurst, 2)).toBe(false);
  });

  it("нікого поруч — повідомлення в лог", () => {
    const { messages } = perform([unit("g", { side: ParticipantSide.ALLY, at: { x: 1, y: 1 }, abilities: [ABILITIES.fireBurst] }), unit("e1", { at: { x: 15, y: 15 } })], "fireBurst", { map: MAP, rng: FAIL });

    expect(textsOf(messages).join(" ")).toContain("поруч нікого");
  });
});
