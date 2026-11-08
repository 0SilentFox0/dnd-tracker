import { describe, expect, it } from "vitest";

import { mazeMap } from "./fixtures";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { placed } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { spellTargetCandidates } from "@/lib/utils/battle/flows";
import { targetMarks } from "@/lib/utils/battle/grid/map-view";
import { bonusTargetCandidates } from "@/lib/utils/battle/view";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleAttack, IllusionPair } from "@/types/battle";

const a = placed("a", { side: ParticipantSide.ALLY, at: { x: 1, y: 1 } });

const b = placed("b", { side: ParticipantSide.ALLY, at: { x: 2, y: 1 } });

const c = placed("c", { side: ParticipantSide.ALLY, at: { x: 1, y: 2 } });

const pair: IllusionPair = { a: "a", b: "b", aSees: { name: "X" }, bSees: { name: "Y" } };

const withPair = mazeMap({ illusionSwap: { pairs: [pair] } });

const ids = (list: { basicInfo: { id: string } }[]) => list.map((p) => p.basicInfo.id);

describe("client target pickers treat an illusion partner as hostile", () => {
  it("map target marks include the partner", () => {
    const sword = { id: "s", name: "Sword", type: AttackType.MELEE } as BattleAttack;

    expect(targetMarks(withPair, [a, b, c], a, [sword]).get("2:1")).toBe("target");
    expect(targetMarks(mazeMap({ illusionSwap: { pairs: [] } }), [a, b, c], a, [sword]).has("2:1")).toBe(false);
  });

  it("spell candidates: partner is an enemy target, not an ally target", () => {
    expect(ids(spellTargetCandidates([a, b, c], a, "enemy", withPair))).toEqual(["b"]);
    expect(ids(spellTargetCandidates([a, b, c], a, "ally", withPair))).toEqual(["a", "c"]);
  });

  it("enemy-target abilities offer the partner", () => {
    const ability = { key: "k", effects: [{ kind: "dealDamage", target: "eventTarget" }] } as unknown as ResolvedAbility;

    expect(ids(bonusTargetCandidates(ability, [a, c], [b], a, withPair))).toEqual(["b"]);
    expect(ids(bonusTargetCandidates(ability, [a, b, c], [], a, withPair))).toEqual(["b"]);
  });
});
