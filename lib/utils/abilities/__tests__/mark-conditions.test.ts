import { describe, expect, it } from "vitest";

import { makeParticipant, resolved, seq } from "./fixtures";

import { ParticipantSide } from "@/lib/constants/battle";
import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import { evaluateCondition } from "@/lib/utils/abilities/registry/conditions";
import { AbilitySchema } from "@/lib/utils/abilities/schema";
import { processStartOfTurn } from "@/lib/utils/battle/battle-turn";
import type { AbilityEvent } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

const semgrun = resolved({
  name: "Семгрун",
  trigger: { event: "attack", phase: "before", role: "target" },
  condition: { type: "not", condition: { type: "hasMark", who: "eventActor", markId: "semgrun", bySelf: true } },
  effects: [
    { kind: "flag", flag: "disadvantage", target: "eventActor" },
    { kind: "mark", markId: "semgrun", duration: { rounds: 1 }, target: "eventActor" },
  ],
});

const attackEvent = { type: "attack", phase: "before", actorId: "a", targetId: "s", attackKind: "melee" } as AbilityEvent;

const fire = (ps: BattleParticipant[]) => runAbilities(ps, attackEvent, { round: 1, rng: seq(0) });

describe("hasMark / not", () => {
  it("Семгрун: first attack per round is hindered, second is not, next round again", () => {
    let ps = [makeParticipant({ id: "a" }), makeParticipant({ id: "s", side: ParticipantSide.ENEMY, abilities: [semgrun] })];

    const first = fire(ps);

    expect(first.actionModifiers.a?.some((m) => m.kind === "flag" && m.flag === "disadvantage")).toBe(true);

    ps = first.participants;

    const second = fire(ps);

    expect(second.actionModifiers.a ?? []).toHaveLength(0);

    const attacker = ps.find((p) => p.basicInfo.id === "a") as BattleParticipant;

    ps = processStartOfTurn(attacker, 2, ps).participants;

    expect(fire(ps).actionModifiers.a?.length).toBeGreaterThan(0);
  });

  it("hasMark without bySelf counts any source; schema accepts both", () => {
    const owner = makeParticipant({ id: "o" });

    const marked = {
      ...makeParticipant({ id: "m" }),
      battleData: { ...makeParticipant({ id: "m" }).battleData, activeEffects: [{ id: "x", name: "x", type: "debuff" as const, duration: 1, appliedAt: { round: 1, timestamp: new Date() }, effects: [], abilityKey: "mark:k", source: { participantId: "other", name: "other" } }] },
    };

    const ctx = { owner, event: { type: "attack", phase: "before", actorId: "m", targetId: "o", attackKind: "melee" } as AbilityEvent, participants: [owner, marked] };

    expect(evaluateCondition({ type: "hasMark", who: "eventActor", markId: "k" }, ctx)).toBe(true);
    expect(evaluateCondition({ type: "hasMark", who: "eventActor", markId: "k", bySelf: true }, ctx)).toBe(false);
    expect(AbilitySchema.safeParse({ ...semgrun, id: "a" }).success).toBe(true);
  });
});
