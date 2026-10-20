import { describe, expect, it } from "vitest";

import { emptyMaze, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { hpOf, placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { BattleParticipant } from "@/types/battle";

const roar = resolved({ trigger: { event: "battleStart" }, effects: [{ kind: "dealDamage", amount: 4, target: "allEnemies" }] });

const ctx = { round: 1, rng: () => 0 };

const flagged = (p: BattleParticipant, data: Partial<BattleParticipant["battleData"]>): BattleParticipant => ({ ...p, battleData: { ...p.battleData, ...data } });

describe("сплячі й вибулі в лабіринті не діють", () => {
  const hero = makeParticipant({ id: "h", side: ParticipantSide.ALLY, hp: 20, maxHp: 20 });

  const beast = makeParticipant({ id: "b", side: ParticipantSide.ENEMY, abilities: [roar] });

  it("активний ворог б'є на старті бою", () => {
    expect(hpOf(runAbilities([hero, beast], { type: "battleStart" }, ctx).participants, "h")).toBe(16);
  });

  it("сплячий ворог і вибулий герой не спрацьовують", () => {
    expect(hpOf(runAbilities([hero, flagged(beast, { dormant: true })], { type: "battleStart" }, ctx).participants, "h")).toBe(20);

    const escapee = flagged(makeParticipant({ id: "e", side: ParticipantSide.ALLY, abilities: [roar] }), { escaped: true });

    expect(hpOf(runAbilities([escapee, beast], { type: "battleStart" }, ctx).participants, "b")).toBe(beast.combatStats.currentHp);
  });

  it("з картою лабіринту «усі вороги» на старті — лише ті, кого видно", () => {
    const seer = flagged(placed("s", { at: { x: 1, y: 5 }, abilities: [roar] }), { facing: "e" });

    const near = placed("near", { side: ParticipantSide.ALLY, at: { x: 3, y: 5 } });

    const far = placed("far", { side: ParticipantSide.ALLY, at: { x: 8, y: 5 } });

    const map = testMap(12, 12, { maze: { ...emptyMaze(), walls: ["5:5:e", "5:4:e", "5:6:e"] } });

    const out = runAbilities([seer, near, far], { type: "battleStart" }, { ...ctx, map }).participants;

    expect(hpOf(out, "near")).toBe(196);
    expect(hpOf(out, "far")).toBe(200);
  });
});
