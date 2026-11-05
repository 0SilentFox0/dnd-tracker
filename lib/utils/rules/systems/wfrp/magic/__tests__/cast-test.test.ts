import { describe, expect, it } from "vitest";

import { applyWfrpConditionTo } from "../../conditions/apply";
import { wfrpCastTest } from "../cast-test";
import { caster } from "./fixtures";

import { textRef } from "@/lib/i18n/text-ref";
import { mulberry32 } from "@/lib/utils/common/rng";
import type { CastTestCtx } from "@/lib/utils/rules/systems/types";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";
import type { SpellMagic } from "@/lib/utils/spells/model/schema";

const spell = { id: "s", name: "Bolt", level: 1, groupId: null, definition: {} } as unknown as CastTestCtx["spell"];

const run = (presetRoll: number, magic: Partial<SpellMagic> = {}, extra: Partial<CastTestCtx> = {}) =>
  wfrpCastTest({ caster: caster(), spell, magic: { cn: 2, kind: "arcane", overcast: null, ...magic }, rules: WFRP_RULES, rng: mulberry32(1), presetRoll, ...extra });

describe("wfrpCastTest", () => {
  it("roll 30 against 50 gives SL 2 and meets CN 2", () => {
    const r = run(30);

    expect(r.success).toBe(true);
    expect(r.sl).toBe(2);
    expect(r.overcastSteps).toBe(0);
    expect(r.miscast).toBeNull();
    expect(r.percentile).toMatchObject({ roll: 30, target: 50, cn: 2, outcome: "success" });
  });

  it("fails when SL is below CN", () => {
    const r = run(30, { cn: 3 });

    expect(r.success).toBe(false);
    expect(r.percentile.outcome).toBe("failure");
  });

  it("channelled SL carries a cast over CN", () => {
    const r = wfrpCastTest({ caster: caster({ channelledSl: 2 }), spell, magic: { cn: 4, kind: "arcane", overcast: null }, rules: WFRP_RULES, rng: mulberry32(1), presetRoll: 30 });

    expect(r.success).toBe(true);
    expect(r.percentile.channelled).toBe(2);
  });

  it("overcast steps come from surplus SL for dice overcast only", () => {
        const high = (overcast: SpellMagic["overcast"], kind: SpellMagic["kind"] = "arcane") =>
      wfrpCastTest({ caster: caster({ channelledSl: 1 }), spell, magic: { cn: 2, kind, overcast }, rules: WFRP_RULES, rng: mulberry32(1), presetRoll: 3 });

    expect(high("dice").sl).toBe(6);
    expect(high("dice").overcastSteps).toBe(2);
    expect(high("dice", "petty").overcastSteps).toBe(0);
    expect(high(null).overcastSteps).toBe(0);
  });

  it("doubles with success is a critical cast with a minor miscast", () => {
    const r = run(33, { cn: 8 });

    expect(r.success).toBe(true);
    expect(r.percentile.outcome).toBe("critical");
    expect(r.miscast).toBe("minor");
    expect(r.lines[0]).toMatchObject({ message: "wfrpMagic.log.castCritical" });
  });

  it("doubles with failure fails with a minor miscast", () => {
    const r = run(77);

    expect(r.success).toBe(false);
    expect(r.miscast).toBe("minor");
  });

  it("100 is a major miscast", () => {
    expect(run(100).miscast).toBe("major");
  });

  it("Fatigued lowers the target", () => {
    const tired = applyWfrpConditionTo(caster(), { key: "fatigued", levels: 2, round: 1, sourceName: textRef("battleWfrp.log.removed", { target: "x", condition: "y" }) }).participant;

    const r = wfrpCastTest({ caster: tired, spell, magic: { cn: 2, kind: "arcane", overcast: null }, rules: WFRP_RULES, rng: mulberry32(1), presetRoll: 30 });

    expect(r.percentile.target).toBe(30);
  });

  it("Fortune sl adds a level and is reported", () => {
    const r = run(30, {}, { fortune: { kind: "sl" } });

    expect(r.sl).toBe(3);
    expect(r.fortune).toEqual({ kind: "sl" });
  });

  it("Fortune reroll is not spent on a first-roll success", () => {
    const r = run(30, {}, { fortune: { kind: "reroll", manualReroll: 10 } });

    expect(r.fortune).toBeUndefined();
    expect(r.percentile.roll).toBe(30);
  });

  it("Fortune reroll replaces a failed roll", () => {
    const r = run(60, {}, { fortune: { kind: "reroll", manualReroll: 30 } });

    expect(r.success).toBe(true);
    expect(r.fortune).toEqual({ kind: "reroll", firstRoll: 60 });
  });

  it("success and failure lines carry name, spell, roll, target, sl and cn", () => {
    expect(run(30).lines[0]).toEqual(textRef("wfrpMagic.log.castSuccess", { name: "c", spell: "Bolt", roll: 30, target: 50, sl: 2, cn: 2 }));
    expect(run(60).lines[0]).toMatchObject({ message: "wfrpMagic.log.castFail" });
  });
});

describe("castPreview and badge", () => {
  it("shows both targets, banked SL and armour", async () => {
    const { WFRP_MAGIC } = await import("../index");

    expect(WFRP_MAGIC.castPreview(caster({ channelledSl: 2 }))).toEqual({ target: 50, channelTarget: 40, channelled: 2, armourSl: 0 });
  });

  it("badge only while SL is banked", async () => {
    const { channelBadge } = await import("../badge");

    expect(channelBadge(caster())).toBeNull();
    expect(channelBadge(caster({ channelledSl: 3 }))).toMatchObject({ permanent: true, label: { params: { sl: 3 } } });
  });
});
