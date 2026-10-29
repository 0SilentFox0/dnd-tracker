import { describe, expect, it } from "vitest";

import { enT, ukT } from "../../__tests__/describe-fixtures";
import { describeCondition } from "../conditions";
import { describeTrigger, TRIGGER_REGISTRY } from "../triggers";

import type { Condition, Trigger, TriggerEvent } from "@/lib/utils/abilities/schema";
import { renderSegments } from "@/lib/utils/abilities/segments";

const CYRILLIC = /[А-Яа-яІіЇїЄєҐґ]/;

const TRIGGERS: Trigger[] = [
  { event: "passive" },
  { event: "battleStart" },
  { event: "roundStart" },
  { event: "roundEnd" },
  { event: "turnStart" },
  { event: "turnEnd" },
  { event: "attack", phase: "before", role: "attacker" },
  { event: "hit", role: "attacker", whose: "ally" },
  { event: "kill", role: "killer" },
  { event: "lethalDamage" },
  { event: "spellCast", phase: "after", role: "caster", spellIds: ["a"], school: "fire", spellLevels: [1, 2] },
  { event: "moraleCheck", result: "any", whose: "self" },
  { event: "action" },
  { event: "bonusAction" },
];

const CONDITIONS: Condition[] = [
  { type: "hpBelow", who: "self", percent: 50 },
  { type: "hpAbove", who: "anyEnemy", percent: 30 },
  { type: "attackKind", kind: "magic" },
  { type: "targetHasCondition", condition: "stunned" },
  { type: "targetCreatureType", types: ["undead", "fiend"] },
  { type: "targetRace", races: ["elf"] },
  { type: "targetDead" },
  { type: "actorIsEnemy" },
  { type: "hasMark", who: "eventTarget", markId: "m", bySelf: true },
  { type: "armorWorn", categories: ["light", "none"], shield: "without" },
  { type: "attackRollMode", mode: "advantage" },
  { type: "allyAdjacent" },
  { type: "notMoved" },
  { type: "withThisItem" },
  { type: "not", condition: { type: "targetDead" } },
  { type: "all", conditions: [{ type: "targetDead" }, { type: "notMoved" }] },
  { type: "any", conditions: [{ type: "targetDead" }, { type: "notMoved" }] },
];

describe("describeTrigger", () => {
  it("covers every registry event", () => {
    expect(new Set(TRIGGERS.map((t) => t.event))).toEqual(new Set(Object.keys(TRIGGER_REGISTRY) as TriggerEvent[]));
  });

  it("renders in uk and en", async () => {
    const [uk, en] = [await ukT(), await enT()];

    for (const tr of TRIGGERS) {
      const u = renderSegments(uk, describeTrigger(tr)).join(" · ");

      const e = renderSegments(en, describeTrigger(tr)).join(" · ");

      expect(u, tr.event).toBeTruthy();
      expect(u, tr.event).not.toMatch(/[{}]/);
      expect(e, tr.event).not.toMatch(CYRILLIC);
      expect(e, tr.event).not.toMatch(/[{}]/);
    }
  });
});

describe("describeCondition", () => {
  it("covers every condition type", async () => {
    const [uk, en] = [await ukT(), await enT()];

    for (const c of CONDITIONS) {
      const u = renderSegments(uk, describeCondition(c)).join(" ");

      const e = renderSegments(en, describeCondition(c)).join(" ");

      expect(u, c.type).toBeTruthy();
      expect(u, c.type).not.toMatch(/[{}]/);
      expect(e, c.type).not.toMatch(CYRILLIC);
      expect(e, c.type).not.toMatch(/[{}]/);
    }
  });

  it("pins uk text", async () => {
    const t = await ukT();

    expect(CONDITIONS.map((c) => [c.type, renderSegments(t, describeCondition(c)).join(" ")])).toMatchSnapshot();
    expect(renderSegments(t, describeCondition({ type: "not", condition: { type: "targetDead" } }))).toEqual(["НЕ (ціль мертва)"]);
  });
});
