import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { evaluateCondition } from "@/lib/utils/abilities/registry/conditions";
import { EFFECT_REGISTRY } from "@/lib/utils/abilities/registry/effects";
import { TRIGGER_REGISTRY, triggerMatches } from "@/lib/utils/abilities/registry/triggers";

describe("registry contract", () => {
  it("кожен ефект має label, fields, describe, apply", () => {
    for (const def of Object.values(EFFECT_REGISTRY)) {
      expect(def.label, def.kind).toBeTruthy();
      expect(Array.isArray(def.fields), def.kind).toBe(true);
      expect(typeof def.describe, def.kind).toBe("function");
      expect(typeof def.apply, def.kind).toBe("function");
    }
  });

  it("кожен тригер має label і matches", () => {
    for (const def of Object.values(TRIGGER_REGISTRY)) {
      expect(def.label).toBeTruthy();
      expect(typeof def.matches).toBe("function");
    }
  });
});

describe("triggerMatches", () => {
  const a = makeParticipant({ id: "a" });

  const ally = makeParticipant({ id: "b" });

  const e = makeParticipant({ id: "e", side: ParticipantSide.ENEMY });

  const ps = [a, ally, e];

  const atk = { type: "attack" as const, phase: "before" as const, actorId: "e", targetId: "a", attackKind: "ranged" as const };

  it("роль target спрацьовує для цілі атаки", () => {
    expect(triggerMatches({ event: "attack", phase: "before", role: "target" }, atk, a, ps)).toBe(true);
    expect(triggerMatches({ event: "attack", phase: "before", role: "attacker" }, atk, a, ps)).toBe(false);
    expect(triggerMatches({ event: "attack", phase: "before", role: "target", attackKind: "melee" }, atk, a, ps)).toBe(false);
  });

  it("kill: killer / killerSide / victimSide", () => {
    const kill = { type: "kill" as const, actorId: "a", targetId: "e" };

    expect(triggerMatches({ event: "kill", role: "killer" }, kill, a, ps)).toBe(true);
    expect(triggerMatches({ event: "kill", role: "killerSide" }, kill, ally, ps)).toBe(true);
    expect(triggerMatches({ event: "kill", role: "victimSide" }, kill, ally, ps)).toBe(false);
    expect(triggerMatches({ event: "kill", role: "victimSide" }, { type: "kill", actorId: "e", targetId: "a" }, ally, ps)).toBe(true);
  });

  it("battleStart з newcomerIds — лише для новачків", () => {
    expect(triggerMatches({ event: "battleStart" }, { type: "battleStart", newcomerIds: ["b"] }, a, ps)).toBe(false);
    expect(triggerMatches({ event: "battleStart" }, { type: "battleStart", newcomerIds: ["b"] }, ally, ps)).toBe(true);
  });

  it("passive ніколи не матчиться", () => {
    expect(triggerMatches({ event: "passive" }, { type: "roundStart" }, a, ps)).toBe(false);
  });
});

describe("evaluateCondition", () => {
  it("hpBelow anyAlly не враховує власника", () => {
    const owner = makeParticipant({ id: "o", hp: 1 });

    const ally = makeParticipant({ id: "x", hp: 3, maxHp: 20 });

    const ctx = { owner, event: null, participants: [owner, ally] };

    expect(evaluateCondition({ type: "hpBelow", who: "anyAlly", percent: 15 }, ctx)).toBe(true);
    expect(evaluateCondition({ type: "hpBelow", who: "anyAlly", percent: 10 }, ctx)).toBe(false);
    expect(evaluateCondition({ type: "any", conditions: [{ type: "hpAbove", who: "self", percent: 90 }, { type: "hpBelow", who: "self", percent: 10 }] }, ctx)).toBe(true);
  });

  it("attackKind з події заклинання — magic", () => {
    const owner = makeParticipant({ id: "o" });

    const ctx = { owner, event: { type: "spellCast" as const, phase: "before" as const, actorId: "o", targetIds: [] }, participants: [owner] };

    expect(evaluateCondition({ type: "attackKind", kind: "magic" }, ctx)).toBe(true);
  });
});
