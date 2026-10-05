import { describe, expect, it } from "vitest";

import {
  allowedEffectKinds,
  changeEffectKind,
  changeTriggerEvent,
  getAtPath,
  newAbility,
  newEffect,
  newTrigger,
  setAtPath,
  validateAbilities,
  withFreshIds,
} from "@/lib/utils/abilities/editor";
import { EFFECT_REGISTRY } from "@/lib/utils/abilities/registry/effects";
import { TRIGGER_REGISTRY } from "@/lib/utils/abilities/registry/triggers";
import { AbilitySchema, type EffectKind, type TriggerEvent } from "@/lib/utils/abilities/schema";

const EVENTS = Object.keys(TRIGGER_REGISTRY) as TriggerEvent[];

const KINDS = Object.keys(EFFECT_REGISTRY) as EffectKind[];

describe("editor helpers", () => {
  it("newEffect валідний для кожного виду в кожному дозволеному тригері", () => {
    for (const event of EVENTS) {
      const trigger = newTrigger(event);

      for (const kind of allowedEffectKinds(trigger)) {
        const a = { id: "a", name: "Т", trigger, effects: [newEffect(kind, trigger)] };

        expect(AbilitySchema.safeParse(a).success, `${event}/${kind}`).toBe(true);
      }
    }
  });

  it("пасивка не пропонує нестатичні ефекти", () => {
    expect(allowedEffectKinds({ event: "passive" })).toEqual(["modifyStat", "damageBonus", "flag", "note"]);
    expect(allowedEffectKinds({ event: "turnStart" })).toEqual(KINDS);
  });

  it("changeEffectKind зберігає сумісну ціль", () => {
    const trigger = newTrigger("hit");

    const dot = newEffect("dot", trigger);

    const next = changeEffectKind({ ...dot, target: "allEnemies" } as typeof dot, "applyCondition", trigger);

    expect(next).toMatchObject({ kind: "applyCondition", target: "allEnemies" });
  });

  it("changeTriggerEvent на пасивку прибирає ліміти й тривалості", () => {
    const a = { id: "a", name: "Т", trigger: newTrigger("hit"), limits: { perBattle: 1 }, effects: [{ kind: "modifyStat" as const, stat: "armor" as const, flat: 1, duration: { rounds: 1 }, target: "eventTarget" as const }] };

    const p = changeTriggerEvent(a, "passive");

    expect(p.limits).toBeUndefined();
    expect(p.effects[0]).toEqual({ kind: "modifyStat", stat: "armor", flat: 1 });
    expect(changeTriggerEvent(p, "hit").effects[0]).toMatchObject({ duration: { rounds: 1 } });
  });

  it("setAtPath / getAtPath", () => {
    const o = { filter: { kind: "melee" }, percent: 10 };

    const n = setAtPath(o, "filter.kind", "ranged");

    expect(n).toEqual({ filter: { kind: "ranged" }, percent: 10 });
    expect(o.filter.kind).toBe("melee");
    expect(getAtPath(n, "filter.kind")).toBe("ranged");
    expect(setAtPath(o, "percent", undefined)).toEqual({ filter: { kind: "melee" } });
  });

  it("validateAbilities — шляхи помилок", () => {
    const r = validateAbilities([newAbility([]), { id: "x", name: "Б", trigger: { event: "passive" }, effects: [{ kind: "heal", amount: 5 }] }]);

    expect(r.ok).toBe(false);
    expect(Object.keys(r.errorsByPath)).toContain("1.effects.0");
  });

  it("withFreshIds — без колізій", () => {
    const base = { name: "Т", trigger: { event: "passive" as const }, effects: [{ kind: "note" as const, text: "x" }] };

    const out = withFreshIds([{ id: "a1", ...base }, { id: "a1", ...base }], ["a1", "a2"]);

    expect(out.map((a) => a.id)).toEqual(["a3", "a4"]);
  });
});
