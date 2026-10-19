import { describe, expect, it } from "vitest";

import { ABILITIES, byId, hp, MAP, percentOfAttack, perform,unit } from "./fixtures";

import { ParticipantSide } from "@/lib/constants/battle";
import { withinLimits } from "@/lib/utils/abilities/engine/core/usage";
import type { GridPoint } from "@/types/battle";

const griffin = (at?: GridPoint) => unit("g", { side: ParticipantSide.ALLY, at, abilities: [ABILITIES.squall] });

const line = () => [
  griffin({ x: 0, y: 5 }),
  unit("e1", { at: { x: 2, y: 5 } }),
  unit("a1", { side: ParticipantSide.ALLY, at: { x: 3, y: 5 } }),
  unit("e2", { at: { x: 4, y: 5 } }),
  unit("e3", { at: { x: 6, y: 5 } }),
  unit("e4", { at: { x: 6, y: 8 } }),
];

describe("Шквал", () => {
  it("бʼє кожного ворога на прямій, союзника — ні, і сідає на останню клітинку", () => {
    const { participants: ps } = perform(line(), "squall", { map: MAP, targetCell: { x: 8, y: 5 } });

    const dmg = percentOfAttack(byId(ps, "g"), 100);

    expect(dmg).toBeGreaterThan(0);

    for (const id of ["e1", "e2", "e3"]) expect(hp(ps, id)).toBe(200 - dmg);

    expect(hp(ps, "a1")).toBe(200);
    expect(hp(ps, "e4")).toBe(200);
    expect(byId(ps, "g").battleData.position).toEqual({ x: 8, y: 5 });
    expect(byId(ps, "g").battleData.movementUsed).toBeUndefined();
  });

  it("кінцева клітинка зайнята — сідає на попередню вільну", () => {
    const { participants: ps } = perform([...line(), unit("a2", { side: ParticipantSide.ALLY, at: { x: 8, y: 5 } })], "squall", { map: MAP, targetCell: { x: 8, y: 5 } });

    expect(byId(ps, "g").battleData.position).toEqual({ x: 7, y: 5 });
  });

  it("летить не далі за дальність", () => {
    const { participants: ps } = perform([griffin({ x: 0, y: 5 }), unit("far", { at: { x: 15, y: 5 } })], "squall", { map: MAP, targetCell: { x: 19, y: 5 } });

    expect(byId(ps, "g").battleData.position).toEqual({ x: 12, y: 5 });
    expect(hp(ps, "far")).toBe(200);
  });

  it("без карти бʼє обраних ворогів", () => {
    const { participants: ps } = perform([griffin(), unit("e1"), unit("e2"), unit("e3")], "squall", { targetIds: ["e1", "e2", "e3"] });

    const dmg = percentOfAttack(byId(ps, "g"), 100);

    for (const id of ["e1", "e2", "e3"]) expect(hp(ps, id)).toBe(200 - dmg);
  });

  it("перезарядка 2 раунди", () => {
    const { participants: ps } = perform([griffin(), unit("e1")], "squall", { targetIds: ["e1"] });

    expect(withinLimits(byId(ps, "g"), ABILITIES.squall, 2)).toBe(false);
  });
});
