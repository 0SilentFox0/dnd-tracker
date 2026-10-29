import { describe, expect, it } from "vitest";
import type { z } from "zod";

import { ukT } from "@/lib/utils/abilities/__tests__/describe-fixtures";
import { CONDITION_REGISTRY } from "@/lib/utils/abilities/registry/conditions";
import { describeAbilityText, EFFECT_REGISTRY, FLAG_FIELDS } from "@/lib/utils/abilities/registry/effects";
import { limitsSegments } from "@/lib/utils/abilities/registry/labels";
import { TRIGGER_REGISTRY } from "@/lib/utils/abilities/registry/triggers";
import { ConditionSchema, EffectSchema, TriggerSchema } from "@/lib/utils/abilities/schema";
import { renderSegments } from "@/lib/utils/abilities/segments";

const keysOf = (s: z.ZodType) => Object.keys((s as unknown as { shape: Record<string, unknown> }).shape);

const topLevel = (names: readonly { name: string }[]) => new Set(names.map((f) => f.name.split(".")[0]));

describe("fields contract", () => {
  it("кожне поле ефекту описане в fields (прапорці — у FLAG_FIELDS)", () => {
    for (const option of (EffectSchema as unknown as { options: z.ZodType[] }).options) {
      const nested = (option as unknown as { options?: z.ZodType[] }).options;

      if (nested && !("shape" in (option as object))) {
        for (const flagOption of nested) {
          const shape = (flagOption as unknown as { shape: Record<string, { value?: string }> }).shape;

          const flag = (shape.flag as unknown as { value: string }).value as keyof typeof FLAG_FIELDS;

          const covered = new Set([...topLevel(FLAG_FIELDS[flag]), "kind", "flag", "target", "duration"]);

          for (const key of keysOf(flagOption)) expect(covered.has(key), `flag.${flag}.${key}`).toBe(true);
        }

        continue;
      }

      const kind = ((option as unknown as { shape: { kind: { value: string } } }).shape.kind.value) as keyof typeof EFFECT_REGISTRY;

      const covered = new Set([...topLevel(EFFECT_REGISTRY[kind].fields), "kind", ...(kind === "randomOf" ? ["options"] : [])]);

      for (const key of keysOf(option)) expect(covered.has(key), `${kind}.${key}`).toBe(true);
    }
  });

  it("кожне поле тригера описане", () => {
    for (const option of (TriggerSchema as unknown as { options: z.ZodType[] }).options) {
      const event = (option as unknown as { shape: { event: { value: string } } }).shape.event.value as keyof typeof TRIGGER_REGISTRY;

      const covered = new Set([...topLevel(TRIGGER_REGISTRY[event].fields), "event"]);

      for (const key of keysOf(option)) expect(covered.has(key), `${event}.${key}`).toBe(true);
    }
  });

  it("кожне поле умови описане", () => {
    const union = (ConditionSchema as unknown as { _zod: { def: { getter: () => { options: z.ZodType[] } } } })._zod.def.getter();

    for (const option of union.options) {
      const type = (option as unknown as { shape: { type: { value: string } } }).shape.type.value as keyof typeof CONDITION_REGISTRY;

      const covered = new Set([...topLevel(CONDITION_REGISTRY[type].fields), "type"]);

      for (const key of keysOf(option)) expect(covered.has(key), `${type}.${key}`).toBe(true);
    }
  });

  it("describeAbilityText", async () => {
    const t = await ukT();

    expect(
      describeAbilityText({ id: "a", name: "Кровотеча", trigger: { event: "hit", role: "attacker" }, limits: { perBattle: 1, chance: 30 }, effects: [{ kind: "dot", damagePerRound: "1d4", damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" }] }, t),
    ).toBe("Влучання · 1 раз за бій · 30% · Кровотеча 1d4/раунд × 2 р.");
  });

  it("ліміт за бій узгоджується з числом", async () => {
    const t = await ukT();

    expect(renderSegments(t, limitsSegments({ perBattle: 2 }))).toEqual(["2 рази за бій"]);
    expect(renderSegments(t, limitsSegments({ perBattle: 5 }))).toEqual(["5 разів за бій"]);
  });
});
