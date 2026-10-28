import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { deriveTrajectory, targetMarks } from "@/lib/utils/battle/grid";
import type { BattleAttack } from "@/types/battle";

const bow: BattleAttack = { id: "b", name: "Лук", type: AttackType.RANGED, attackBonus: 5, damageDice: "1d8", damageType: "piercing", range: "80/320" };

describe("deriveTrajectory cover", () => {
  const archer = placed("a", { side: ParticipantSide.ALLY, at: { x: 0, y: 5 }, attacks: [bow] });

  const target = placed("t", { at: { x: 6, y: 5 } });

  const map = testMap();

  const run = (extra: ReturnType<typeof placed>[]) => {
    const participants = [archer, target, ...extra];

    return deriveTrajectory({ map, participants, marks: targetMarks(map, participants, archer, [bow]), current: archer }, { x: 6, y: 5 });
  };

  it("союзник на лінії — cover з його клітинкою", () => {
    expect(run([placed("ally", { side: ParticipantSide.ALLY, at: { x: 3, y: 5 } })])?.cover).toEqual(["3:5"]);
  });

  it("вільна лінія — без cover", () => {
    expect(run([])?.cover).toBeUndefined();
  });
});
