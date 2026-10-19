import { describe, expect, it } from "vitest";

import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { CONTROLLED_BY_DM } from "@/lib/constants/characters";
import { makeEffect, makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { allyOwners, freeUnits, randomizeUnitControl, setUnitController } from "@/lib/utils/battle/participant/unit-control";
import type { BattleParticipant } from "@/types/battle";

const DM = "dm-user";

const hero = (id: string, controlledBy: string, side: ParticipantSide = ParticipantSide.ALLY): BattleParticipant => {
  const p = makeParticipant({ id, side });

  return { ...p, basicInfo: { ...p.basicInfo, sourceType: ParticipantSourceType.CHARACTER, controlledBy } };
};

const unit = (id: string, side: ParticipantSide = ParticipantSide.ALLY, controlledBy = CONTROLLED_BY_DM, battleData: Partial<BattleParticipant["battleData"]> = {}): BattleParticipant => {
  const p = makeParticipant({ id, side });

  return { ...p, basicInfo: { ...p.basicInfo, sourceType: ParticipantSourceType.UNIT, controlledBy }, battleData: { ...p.battleData, ...battleData } };
};

const owners = (ps: BattleParticipant[]) => Object.fromEntries(ps.map((p) => [p.basicInfo.id, p.basicInfo.controlledBy]));

describe("allyOwners", () => {
  it("унікальні власники справжніх героїв союзної сторони, за порядком", () => {
    expect(allyOwners([hero("a", "p2"), hero("b", "p1"), hero("c", "p2"), hero("npc", DM), hero("e", "p3", ParticipantSide.ENEMY), unit("u")], DM)).toEqual(["p2", "p1"]);
  });
});

describe("setUnitController", () => {
  const order = () => [hero("a", "p1"), hero("b", "p2"), unit("u1"), unit("e1", ParticipantSide.ENEMY)];

  const ok = (r: ReturnType<typeof setUnitController>) => ("participants" in r ? r.participants : []);

  it("передає юніта гравцю й назад ДМ (id ДМ або CONTROLLED_BY_DM)", () => {
    const given = ok(setUnitController(order(), "u1", "p2", DM));

    expect(owners(given).u1).toBe("p2");
    expect(owners(ok(setUnitController(given, "u1", DM, DM))).u1).toBe(CONTROLLED_BY_DM);
    expect(owners(ok(setUnitController(given, "u1", CONTROLLED_BY_DM, DM))).u1).toBe(CONTROLLED_BY_DM);
  });

  it("повертає змінений юніт", () => {
    const r = setUnitController(order(), "u1", "p2", DM);

    expect("unit" in r && r.unit.basicInfo.controlledBy).toBe("p2");
  });

  it("помилки: ворожий, не юніт, прикликаний, зачарований, чужий гравець", () => {
    const summoned = unit("s", ParticipantSide.ALLY, "p1", { summonedBy: "a" });

    const charmed = unit("ch", ParticipantSide.ALLY, "p1", { activeEffects: [makeEffect("charm", { charmOrigin: { side: ParticipantSide.ENEMY, controlledBy: CONTROLLED_BY_DM } })] });

    const ps = [...order(), summoned, charmed];

    for (const id of ["e1", "a", "s", "ch", "missing"]) expect(setUnitController(ps, id, "p1", DM)).toEqual({ error: "Цим юнітом не можна керувати гравцю" });

    expect(setUnitController(ps, "u1", "stranger", DM)).toEqual({ error: "Гравець не бере участі в бою" });
  });
});

describe("randomizeUnitControl", () => {
  it("роздає лише вільних союзних юнітів; решту не чіпає", () => {
    const owned = unit("owned", ParticipantSide.ALLY, "p1");

    const summoned = unit("s", ParticipantSide.ALLY, CONTROLLED_BY_DM, { summonedBy: "a" });

    const charmed = unit("ch", ParticipantSide.ALLY, CONTROLLED_BY_DM, { activeEffects: [makeEffect("charm", { charmOrigin: { side: ParticipantSide.ENEMY, controlledBy: CONTROLLED_BY_DM } })] });

    const ps = [hero("a", "p1"), hero("b", "p2"), unit("u1"), unit("u2"), owned, summoned, charmed, unit("e1", ParticipantSide.ENEMY)];

    const { participants: out, assigned } = randomizeUnitControl(ps, DM, seq(0.1, 0.9));

    expect(assigned.map((x) => [x.unit.basicInfo.id, x.owner])).toEqual([["u1", "p1"], ["u2", "p2"]]);
    expect(owners(out)).toMatchObject({ u1: "p1", u2: "p2", owned: "p1", s: CONTROLLED_BY_DM, ch: CONTROLLED_BY_DM, e1: CONTROLLED_BY_DM, a: "p1", b: "p2" });
  });

  it("без гравців — без змін", () => {
    const ps = [hero("npc", DM), unit("u1")];

    expect(randomizeUnitControl(ps, DM, seq(0.5))).toEqual({ participants: ps, assigned: [] });
  });

  it("freeUnits — союзні юніти під ДМ", () => {
    expect(freeUnits([hero("a", "p1"), unit("u1"), unit("u2", ParticipantSide.ALLY, "p1"), unit("e", ParticipantSide.ENEMY)], DM).map((p) => p.basicInfo.id)).toEqual(["u1"]);
  });
});
