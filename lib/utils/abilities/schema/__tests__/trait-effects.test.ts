import { describe, expect, it } from "vitest";

import { allowedEffectKinds } from "../../editor";
import { describeEffect } from "../../registry/effects";
import { AbilitySchema, EffectSchema } from "..";

import { WFRP_EFFECT_KINDS } from "@/systems/wfrp/rules/trait-kinds";

const ability = (effect: unknown, trigger: unknown = { event: "passive" }) => ({ id: "a1", name: "Trait", trigger, effects: [effect] });

const parse = (effect: unknown, trigger?: unknown) => AbilitySchema.safeParse(ability(effect, trigger));

const valid = [
  { kind: "wfrpArmour", head: 1, body: 2, arm: 3, leg: 12 },
  { kind: "wfrpWard", value: 9 },
  { kind: "wfrpSize", size: "large" },
  { kind: "wfrpPsychology", psychology: "fear", value: 2 },
  { kind: "wfrpAttack", attack: "bite", damage: 3 },
  { kind: "wfrpAttack", attack: "breath", damage: 5, rangeFt: 30, magical: true },
];

describe("wfrp trait effects", () => {
  it.each(valid)("parses %j in a passive", (effect) => {
    expect(parse(effect).success).toBe(true);
  });

  it.each([0, 11, 2.5, "3"])("rejects wfrpWard value %j", (value) => {
    expect(parse({ kind: "wfrpWard", value }).success).toBe(false);
  });

  it("rejects armour out of range and unknown keys", () => {
    expect(parse({ kind: "wfrpArmour", head: 13, body: 0, arm: 0, leg: 0 }).success).toBe(false);
    expect(parse({ kind: "wfrpArmour", head: -1, body: 0, arm: 0, leg: 0 }).success).toBe(false);
    expect(parse({ kind: "wfrpArmour", head: 1, body: 0, arm: 0, leg: 0, extra: 1 }).success).toBe(false);
  });

  it("rejects an unknown size", () => {
    expect(parse({ kind: "wfrpSize", size: "huge" }).success).toBe(false);
  });

  it("allows rangeFt only for breath", () => {
    const r = parse({ kind: "wfrpAttack", attack: "bite", damage: 3, rangeFt: 30 });

    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain("abilities.validation.traitRangeOnlyBreathRanged");
  });

  it.each(valid)("flags %j outside a passive", (effect) => {
    for (const trigger of [{ event: "turnStart" }, { event: "hit", role: "attacker" }]) {
      const r = parse(effect, trigger);

      expect(r.success).toBe(false);
      expect(JSON.stringify(r.error?.issues)).toContain("abilities.validation.passiveEffectKinds");
    }
  });

  it("keeps traits out of randomOf", () => {
    const r = EffectSchema.safeParse({ kind: "randomOf", options: [valid[1], valid[2]] });

    expect(r.success).toBe(false);
  });

  it("does not offer trait kinds in the picker", () => {
    for (const trigger of [{ event: "passive" }, { event: "action" }, { event: "turnStart" }] as const) {
      const kinds = allowedEffectKinds(trigger);

      for (const k of WFRP_EFFECT_KINDS) expect(kinds).not.toContain(k);
    }
  });

  it.each(valid)("describes %j", (effect) => {
    const segments = describeEffect(EffectSchema.parse(effect));

    expect(segments[0].key).not.toBe("summary.unknownEffect");
  });
});

describe("system effect rows", () => {
  it("WFRP_EFFECT_KINDS matches the registered rows and the core root", async () => {
    const { WFRP_EFFECT_ROWS } = await import("@/systems/wfrp/rules/ability-effect-rows");

    const { isSystemEffectKind, SYSTEM_EFFECT_ROWS } = await import("@/lib/utils/abilities/registry/effects/system-rows");

    expect(WFRP_EFFECT_ROWS.map((e) => e.kind)).toEqual([...WFRP_EFFECT_KINDS]);
    expect(SYSTEM_EFFECT_ROWS.map((r) => r.kind)).toEqual([...WFRP_EFFECT_KINDS]);
    expect(isSystemEffectKind("wfrpWard")).toBe(true);
    expect(isSystemEffectKind("heal")).toBe(false);
  });
});
