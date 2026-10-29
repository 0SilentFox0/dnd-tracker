import { describe, expect, it } from "vitest";

import { ABILITY_FIXTURES, EFFECT_FIXTURES, enT, LIMITS_FIXTURES, ukT } from "./describe-fixtures";

import { describeAbilityText, describeEffect } from "@/lib/utils/abilities/registry/effects";
import { limitsLabel, limitsSegments } from "@/lib/utils/abilities/registry/labels";
import { describeTrigger } from "@/lib/utils/abilities/registry/triggers";
import { renderSegments } from "@/lib/utils/abilities/segments";

const CONVERTED_KINDS = new Set(["dealDamage", "heal", "dot", "hot", "berserk", "charm", "maneuver", "summon", "raiseDead", "modifyStat", "damageBonus", "grantAction", "flag", "applyCondition", "restoreSpellSlotLevels", "restoreSpellSlot", "drainSpellSlot", "changeMorale", "mark", "copySpellBuffs", "guard", "cleanse", "randomOf"]);

describe("describe golden (uk)", () => {
  it("describeAbility", async () => {
    const t = await ukT();

    expect(Object.fromEntries(ABILITY_FIXTURES.map((a) => [a.id, describeAbilityText(a, t)]))).toMatchSnapshot();
  });

  it("describeEffect", async () => {
    const t = await ukT();

    expect(EFFECT_FIXTURES.map((e) => [e.kind === "flag" ? `flag:${e.flag}` : e.kind, renderSegments(t, describeEffect(e)).join(" · ")])).toMatchSnapshot();
  });

  it("describeEffect in en has no cyrillic or raw ICU for converted kinds", async () => {
    const t = await enT();

    for (const e of EFFECT_FIXTURES.filter((f) => CONVERTED_KINDS.has(f.kind))) {
      const text = renderSegments(t, describeEffect(e)).join(" · ");

      expect(text, e.kind).not.toMatch(/[А-Яа-яІіЇїЄєҐґ]/);
      expect(text, e.kind).not.toMatch(/[{}]/);
    }
  });

  it("describeTrigger", () => {
    expect(ABILITY_FIXTURES.filter((a) => a.id.startsWith("trigger-")).map((a) => [a.id, describeTrigger(a.trigger)])).toMatchSnapshot();
  });

  it("limitsLabel", () => {
    expect(LIMITS_FIXTURES.map((l) => [JSON.stringify(l), limitsLabel(l)])).toMatchSnapshot();
  });

  it("limitsSegments render to the same uk text", async () => {
    const t = await ukT();

    for (const l of LIMITS_FIXTURES) expect(renderSegments(t, limitsSegments(l)), JSON.stringify(l)).toEqual(limitsLabel(l));
  });

  it("limitsSegments in en have no cyrillic or raw ICU", async () => {
    const t = await enT();

    for (const l of LIMITS_FIXTURES) {
      for (const text of renderSegments(t, limitsSegments(l))) {
        expect(text).not.toMatch(/[А-Яа-яІіЇїЄєҐґ]/);
        expect(text).not.toContain("{");
      }
    }
  });
});
