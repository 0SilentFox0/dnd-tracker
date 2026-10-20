import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { resolveTargetIds } from "@/lib/utils/abilities/engine/core/targets";
import { placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { mazeMap } from "@/lib/utils/battle/maze/__tests__/fixtures";
import type { BattleParticipant } from "@/types/battle";

const facingEast = (p: BattleParticipant): BattleParticipant => ({ ...p, battleData: { ...p.battleData, facing: "e" } });

const owner = facingEast(placed("me", { side: ParticipantSide.ALLY, at: { x: 1, y: 5 } }));

const seen = placed("seen", { at: { x: 3, y: 5 } });

const hidden = placed("hidden", { at: { x: 8, y: 5 } });

const escaped: BattleParticipant = { ...placed("gone", { side: ParticipantSide.ALLY, at: { x: 0, y: 0 } }), battleData: { ...placed("gone", { side: ParticipantSide.ALLY }).battleData, escaped: true } };

const ps = [owner, seen, hidden, escaped];

const maze = mazeMap({ walls: ["5:5:e", "5:4:e", "5:6:e"] }, 12);

const event = { type: "action" as const, actorId: "me", abilityKey: "k" };

describe("resolveTargetIds у лабіринті", () => {
  it("«усі вороги» — лише вороги в полі зору власника", () => {
    expect(resolveTargetIds("allEnemies", "me", event, ps, { map: maze })).toEqual(["seen"]);
    expect(resolveTargetIds("everyone", "me", event, ps, { map: maze })).toEqual(["me", "seen"]);
  });

  it("без лабіринту — усі вороги, як раніше", () => {
    expect(resolveTargetIds("allEnemies", "me", event, ps, { map: testMap(12, 12) })).toEqual(["seen", "hidden"]);
    expect(resolveTargetIds("allEnemies", "me", event, ps)).toEqual(["seen", "hidden"]);
  });

  it("герой, що вийшов з лабіринту, не отримує ефектів «усі союзники»", () => {
    expect(resolveTargetIds("allAllies", "me", event, ps, { map: maze })).toEqual(["me"]);
    expect(resolveTargetIds("allAllies", "me", event, ps)).toEqual(["me"]);
  });
});
