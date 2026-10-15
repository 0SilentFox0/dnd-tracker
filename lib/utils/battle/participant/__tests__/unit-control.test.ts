import { describe, expect, it } from "vitest";

import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { CONTROLLED_BY_DM } from "@/lib/constants/characters";
import { makeEffect, makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { assignUnitControl } from "@/lib/utils/battle/participant/unit-control";
import type { BattleParticipant } from "@/types/battle";

const DM = "dm-user";

const hero = (id: string, controlledBy: string, level: number, side: ParticipantSide = ParticipantSide.ALLY): BattleParticipant => {
  const p = makeParticipant({ id, side, level });

  return { ...p, basicInfo: { ...p.basicInfo, sourceType: ParticipantSourceType.CHARACTER, controlledBy } };
};

const unit = (id: string, side: ParticipantSide = ParticipantSide.ALLY, battleData: Partial<BattleParticipant["battleData"]> = {}): BattleParticipant => {
  const p = makeParticipant({ id, side });

  return { ...p, basicInfo: { ...p.basicInfo, sourceType: ParticipantSourceType.UNIT, controlledBy: CONTROLLED_BY_DM }, battleData: { ...p.battleData, ...battleData } };
};

const owners = (ps: BattleParticipant[]) => Object.fromEntries(ps.map((p) => [p.basicInfo.id, p.basicInfo.controlledBy]));

describe("assignUnitControl", () => {
  it("юніти сторони отримує гравець із найвищим рівнем, за рівності — перший у порядку", () => {
    const ps = assignUnitControl([hero("a", "p1", 5), hero("b", "p2", 7), hero("c", "p3", 7), unit("u1"), unit("u2")], DM);

    expect(owners(ps)).toMatchObject({ u1: "p2", u2: "p2" });
  });

  it("без справжніх гравців на стороні юнітами керує DM (герої DM і NPC не рахуються)", () => {
    const ps = assignUnitControl([hero("a", "p1", 5), hero("npc", DM, 20, ParticipantSide.ENEMY), unit("e1", ParticipantSide.ENEMY)], DM);

    expect(owners(ps).e1).toBe(CONTROLLED_BY_DM);
  });

  it("прикликаних і зачарованих не переписує", () => {
    const summoned = { ...unit("s"), basicInfo: { ...unit("s").basicInfo, controlledBy: "p1" }, battleData: { ...unit("s").battleData, summonedBy: "a" } };

    const charmed = unit("ch", ParticipantSide.ALLY, { activeEffects: [makeEffect("charm", { charmOrigin: { side: ParticipantSide.ENEMY, controlledBy: CONTROLLED_BY_DM } })] });

    const ps = assignUnitControl([hero("a", "p1", 3), hero("b", "p2", 9), summoned, { ...charmed, basicInfo: { ...charmed.basicInfo, controlledBy: "p1" } }], DM);

    expect(owners(ps)).toMatchObject({ s: "p1", ch: "p1" });
  });
});
