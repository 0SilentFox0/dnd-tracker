import { describe, expect, it } from "vitest";

import { ABILITY_FIXTURES, EFFECT_FIXTURES, LIMITS_FIXTURES } from "./describe-fixtures";

import { describeAbility, describeEffect } from "@/lib/utils/abilities/registry/effects";
import { limitsLabel } from "@/lib/utils/abilities/registry/labels";
import { describeTrigger } from "@/lib/utils/abilities/registry/triggers";

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
});
