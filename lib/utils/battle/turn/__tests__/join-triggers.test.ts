import { describe, expect, it } from "vitest";

import { runJoinTriggers } from "../join-triggers";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import { wfrpAbilitiesOf } from "@/lib/utils/rules/systems/wfrp/combat/participant";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";
import { trait } from "@/lib/utils/rules/systems/wfrp/traits/__tests__/fixtures";

const hero = () => {
  const p = makeParticipant({ id: "h", side: ParticipantSide.ALLY });

  return { ...p, abilities: { ...p.abilities, ...wfrpAbilitiesOf(DEFAULT_CHARACTERISTICS) } };
};

const scary = makeParticipant({ id: "m", side: ParticipantSide.ENEMY, abilities: [trait([{ kind: "wfrpPsychology", psychology: "fear", value: 1 }])] });

describe("runJoinTriggers", () => {
  it("returns the tested participants as targets for wfrp", () => {
    const r = runJoinTriggers([hero(), scary], { round: 1, rng: () => 0.9, map: null, rules: WFRP_RULES });

    expect(r.psychology.targets).toEqual([{ participantId: "h", participantName: "h" }]);
    expect(r.psychology.lines).not.toHaveLength(0);
  });

  it("does nothing extra for d20 rules", () => {
    const r = runJoinTriggers([hero(), scary], { round: 1, rng: () => 0.9, map: null, rules: DEFAULT_RULES });

    expect(r.psychology).toEqual({ lines: [], targets: [] });
    expect(r.participants.every((p) => p.battleData.psychologyTested === undefined)).toBe(true);
  });
});
