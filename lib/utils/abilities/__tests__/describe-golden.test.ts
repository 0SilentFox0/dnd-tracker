import { describe, expect, it } from "vitest";

import { ABILITY_FIXTURES, EFFECT_FIXTURES, enT, LIMITS_FIXTURES, ukT } from "./describe-fixtures";

import { describeAbility, describeEffect } from "@/lib/utils/abilities/registry/effects";
import { limitsLabel, limitsSegments } from "@/lib/utils/abilities/registry/labels";
import { describeTrigger } from "@/lib/utils/abilities/registry/triggers";
import { renderSegments } from "@/lib/utils/abilities/segments";

describe("describe golden (uk)", () => {
  it("describeAbility", () => {
    expect(Object.fromEntries(ABILITY_FIXTURES.map((a) => [a.id, describeAbility(a)]))).toMatchSnapshot();
  });

  it("describeEffect", () => {
    expect(EFFECT_FIXTURES.map((e) => [e.kind === "flag" ? `flag:${e.flag}` : e.kind, describeEffect(e)])).toMatchSnapshot();
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
