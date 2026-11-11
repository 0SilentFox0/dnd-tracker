import { describe, expect, it } from "vitest";

import { channelMutation, channelSchema } from "../channel-mutation";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { context, goblin, participant } from "@/lib/server/battles/__tests__/mutations/fixtures";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import { wfrpAbilitiesOf } from "@/systems/wfrp/rules/combat/participant";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";
import type { BattleParticipant } from "@/types/battle";

const caster = (): BattleParticipant => {
  const p = participant("hero", { controlledBy: "user-1" });

  const characteristics = { ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, wp: 40 } };

  return { ...p, abilities: { ...p.abilities, ...wfrpAbilitiesOf(characteristics) } };
};

const ctx = (over: Parameters<typeof context>[0] = {}, c = caster()) => {
  const base = context({ participants: [c, goblin], ...over });

  return { ...base, meta: { ...base.meta, rules: WFRP_RULES } };
};

const heroOf = (out: { participants: BattleParticipant[] }) => out.participants.find((p) => p.basicInfo.id === "hero") as BattleParticipant;

const text = (out: { events: unknown[] }) => JSON.stringify(out.events);

describe("channelMutation", () => {
  it("success banks SL, spends the main action and logs the success line", () => {
    const out = channelMutation(ctx(), { participantId: "hero", roll: 20 });

    const hero = heroOf(out);

    expect(hero.battleData.channelledSl).toBe(2);
    expect(hero.actionFlags.hasUsedAction).toBe(true);
    expect(text(out)).toContain("wfrpMagic.log.channelSuccess");
  });

  it("serverRoll uses the context rng", () => {
    const out = channelMutation(ctx({ rng: () => 0.05 }), { participantId: "hero", serverRoll: true });

    expect(heroOf(out).battleData.channelledSl).toBeGreaterThan(0);
  });

  it("failure logs the fail line and still spends the action", () => {
    const out = channelMutation(ctx(), { participantId: "hero", roll: 90 });

    expect(heroOf(out).battleData.channelledSl ?? 0).toBe(0);
    expect(heroOf(out).actionFlags.hasUsedAction).toBe(true);
    expect(text(out)).toContain("wfrpMagic.log.channelFail");
  });

  it("roll 100 triggers a miscast", () => {
    const out = channelMutation(ctx(), { participantId: "hero", roll: 100 });

    expect(text(out)).toContain("wfrpMagic.log.miscast");
  });

  it("miscast wounds are recorded in hpChanges and a downed caster goes through the zero-HP flow", () => {
    const weak = caster();

    weak.combatStats = { ...weak.combatStats, currentHp: 1 };

    const out = channelMutation(ctx({ rng: () => 0.99 }, weak), { participantId: "hero", roll: 100 });

    const change = out.events.flatMap((e) => (e as { hpChanges?: { participantId: string; oldHp: number; newHp: number }[] }).hpChanges ?? []).find((h) => h.participantId === "hero");

    expect(change).toMatchObject({ oldHp: 1, newHp: 0 });
    expect(heroOf(out).combatStats.currentHp).toBe(0);
    expect(heroOf(out).combatStats.status).not.toBe(weak.combatStats.status);
  });

  it("rejects off-turn, used action and d20 campaigns", () => {
    expect(() => channelMutation(ctx({ scene: { ...context().scene, turnIndex: 1 } }), { participantId: "hero", roll: 20 })).toThrow(/./);

    const used = caster();

    used.actionFlags = { ...used.actionFlags, hasUsedAction: true };
    expect(() => channelMutation(ctx({}, used), { participantId: "hero", roll: 20 })).toThrow(API_ERRORS.ACTION_USED);

    const d20 = context({ participants: [caster(), goblin] });

    expect(() => channelMutation(d20, { participantId: "hero", roll: 20 })).toThrow(API_ERRORS.BATTLE_CHANNEL_UNSUPPORTED);
  });

  it("schema bounds the roll", () => {
    expect(channelSchema.safeParse({ participantId: "hero", roll: 101 }).success).toBe(false);
    expect(channelSchema.safeParse({ participantId: "hero", roll: 0 }).success).toBe(false);
    expect(channelSchema.safeParse({ participantId: "hero", serverRoll: true }).success).toBe(true);
  });
});
