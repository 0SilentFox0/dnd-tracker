import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import type { BattleParticipant } from "@/types/battle";

const ctx = { round: 1, rng: seq(0) };

const hit = { type: "hit" as const, actorId: "a", targetId: "e", attackKind: "melee" as const, damage: 6 };

const slayer = resolved({
  trigger: { event: "hit", role: "attacker" },
  condition: { type: "targetRace", races: ["Некроманти"] },
  effects: [{ kind: "changeMorale", delta: 1 }],
});

const enemy = (race: string): BattleParticipant => {
  const e = makeParticipant({ id: "e", side: ParticipantSide.ENEMY });

  return { ...e, abilities: { ...e.abilities, race } };
};

const moraleAfter = (target: BattleParticipant) => runAbilities([makeParticipant({ id: "a", abilities: [slayer] }), target], hit, ctx).participants[0].combatStats.morale;

describe("умова targetRace", () => {
  it("спрацьовує проти цілі потрібної раси без урахування регістру", () => {
    expect(moraleAfter(enemy("некроманти"))).toBe(1);
  });

  it("не спрацьовує проти іншої раси", () => {
    expect(moraleAfter(enemy("Люди"))).toBe(0);
  });
});
