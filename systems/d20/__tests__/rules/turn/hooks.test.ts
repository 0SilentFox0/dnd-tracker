import { describe, expect, it } from "vitest";

import { d20LairRoundStart } from "../../../rules/turn/on-round-start";
import { d20DropStalePendingCast } from "../../../rules/turn/on-turn-end";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { beginConcentration } from "@/systems/d20/rules/concentration/sustain";

const ctx = (participants: ReturnType<typeof createMockParticipant>[], id: string, round: number) => ({ participants, id, round, rng: () => 0.5, rules: DEFAULT_RULES });

const caster = (lastRound: number, concentrating: boolean) => {
  const base = createMockParticipant();

  const begun = concentrating ? beginConcentration([base], base.basicInfo.id, "cast1", "Prayer", 12).participants[0] : base;

  return { ...begun, battleData: { ...begun.battleData, pendingCast: { spellId: "prayer", spellName: "Prayer", remainingRounds: 9, totalRounds: 10, lastRound } } };
};

describe("d20DropStalePendingCast", () => {
  it("drops a long cast whose concentration is gone", () => {
    const p = caster(5, false);

    const out = d20DropStalePendingCast(ctx([p], p.basicInfo.id, 2));

    expect(out.participants[0].battleData.pendingCast).toBeUndefined();
  });

  it("drops a long cast whose round has passed, ending its concentration", () => {
    const p = caster(1, true);

    const out = d20DropStalePendingCast(ctx([p], p.basicInfo.id, 2));

    expect(out.participants[0].battleData.pendingCast).toBeUndefined();
    expect(out.participants[0].battleData.activeEffects.some((e) => e.concentration)).toBe(false);
  });

  it("keeps a cast that is still being concentrated on within its round", () => {
    const p = caster(2, true);

    const out = d20DropStalePendingCast(ctx([p], p.basicInfo.id, 2));

    expect(out.participants[0].battleData.pendingCast).toBeDefined();
    expect(out.messages).toEqual([]);
  });
});

describe("d20LairRoundStart", () => {
  it("is silent without an active lair", () => {
    const p = createMockParticipant();

    expect(d20LairRoundStart({ participants: [p], round: 2, rng: () => 0.5, rules: DEFAULT_RULES }).messages).toEqual([]);
  });
});
