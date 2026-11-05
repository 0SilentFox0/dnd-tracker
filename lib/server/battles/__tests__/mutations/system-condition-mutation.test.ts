import { describe, expect, it } from "vitest";

import { context, goblin, hero } from "./fixtures";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { systemConditionMutation, systemConditionSchema } from "@/lib/server/battles/mutations/system-condition/system-condition-mutation";
import { eventTextOf } from "@/lib/utils/battle/log/__tests__/event-text";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";

const conditions = ruleSystemOf(WFRP_RULES).conditions!;

const ctx = (participants = [hero, goblin]) => context({ meta: { ...context().meta, rules: WFRP_RULES }, participants, isDM: true, userId: "dm" });

const levelOf = (out: { participants: typeof hero[] }, key: string) => conditions.list(out.participants.find((p) => p.basicInfo.id === "gob")!).find((c) => c.key === key)?.level ?? 0;

const apply = (body: Record<string, unknown>, c = ctx()) => systemConditionMutation(c, { action: "apply", participantId: "gob", condition: "bleeding", ...body } as never);

describe("systemConditionMutation", () => {
  it("applies leveled condition and logs the target", () => {
    const out = apply({ levels: 2 });

    expect(levelOf(out, "bleeding")).toBe(2);
    expect(out.events).toHaveLength(1);
    expect(eventTextOf(out.events![0] as never)).toContain("Гоблін");
  });

  it("writes no log entry when applying unconscious twice", () => {
    const first = apply({ condition: "unconscious" });

    expect(first.events).toHaveLength(1);

    const again = apply({ condition: "unconscious" }, ctx(first.participants));

    expect(again.events).toEqual([]);
    expect(again.participants).toEqual(first.participants);
  });

  it("applies timed prone", () => {
    const out = apply({ condition: "prone", rounds: 2 });

    const gob = out.participants.find((p) => p.basicInfo.id === "gob")!;

    const eff = gob.battleData.activeEffects.find((e) => e.abilityKey === conditions.list(gob)[0].effectKey)!;

    expect(eff.permanent).toBeFalsy();
    expect(eff.duration).toBe(2);
  });

  it("removes one level, then all", () => {
    const applied = apply({ levels: 2 });

    const c2 = ctx(applied.participants);

    const one = systemConditionMutation(c2, { action: "remove", participantId: "gob", condition: "bleeding" });

    const all = systemConditionMutation(c2, { action: "remove", participantId: "gob", condition: "bleeding", all: true });

    expect(levelOf(one, "bleeding")).toBe(1);
    expect(levelOf(all, "bleeding")).toBe(0);
  });

  it("rejects removing an absent condition", () => {
    expect(() => systemConditionMutation(ctx(), { action: "remove", participantId: "gob", condition: "bleeding" })).toThrow(API_ERRORS.CONDITION_ABSENT);
  });

  it("rejects unknown keys and d20 systems", () => {
    expect(() => apply({ condition: "frenzy" })).toThrow(API_ERRORS.CONDITION_UNSUPPORTED);
    expect(() => apply({}, context({ meta: { ...context().meta, rules: DEFAULT_RULES }, isDM: true }))).toThrow(API_ERRORS.CONDITION_UNSUPPORTED);
  });

  it("validates schema limits", () => {
    const base = { action: "apply", participantId: "gob", condition: "bleeding" };

    expect(systemConditionSchema.safeParse({ ...base, levels: 11 }).success).toBe(false);
    expect(systemConditionSchema.safeParse({ ...base, rounds: 100 }).success).toBe(false);
    expect(systemConditionSchema.safeParse({ ...base, condition: "" }).success).toBe(false);
    expect(systemConditionSchema.safeParse({ ...base, levels: 3 }).success).toBe(true);
  });
});
