import { z, type ZodType } from "zod";

import "server-only";
import { ClassColumnSchema } from "@/lib/schemas/classes";
import { AbilitySchema, LimitsSchema } from "@/lib/utils/abilities/schema/ability";
import { AmountSchema, FlatSchema, FormulaSchema, ScaleSchema } from "@/lib/utils/abilities/schema/common";
import { ConditionSchema } from "@/lib/utils/abilities/schema/conditions";
import { AbilityKeySchema, AnyConditionSchema, EffectSchema, NonRandomEffectSchema } from "@/lib/utils/abilities/schema/effects";
import { TriggerSchema } from "@/lib/utils/abilities/schema/triggers";
import { ArmorStatsSchema } from "@/lib/utils/artifacts/armor-stats";
import { WeaponStatsSchema } from "@/lib/utils/artifacts/weapon-stats";
import { SpellFxSchema } from "@/lib/utils/battle/fx/spell-fx-schema";
import { capitalize } from "@/lib/utils/common/text";
import { ItemStatsSchema } from "@/lib/utils/items/item-stats";
import { RulesetPatchSchema } from "@/lib/utils/rules/schema";

export const pascal = (s: string) => s.split(/[^a-zA-Z0-9]+/).filter(Boolean).map(capitalize).join("");

type Entry = readonly [ZodType, string];

// the discriminator value lives in _zod.propValues; refined members (summon) have no .shape
export const effectKind = (s: ZodType) => [...(s._zod as unknown as { propValues: { kind: Set<string> } }).propValues.kind][0];

export const SHARED_SCHEMAS: ReadonlyArray<Entry> = [
  [AbilitySchema, "Ability"],
  [TriggerSchema, "Trigger"],
  [ConditionSchema, "Condition"],
  [LimitsSchema, "AbilityLimits"],
  [EffectSchema, "Effect"],
  [NonRandomEffectSchema, "NonRandomEffect"],
  ...(NonRandomEffectSchema.options as readonly ZodType[]).map((s): Entry => [s, `Effect.${effectKind(s)}`]),
  [FormulaSchema, "Formula"],
  [ScaleSchema, "Scale"],
  [FlatSchema, "Flat"],
  [AmountSchema, "Amount"],
  [AbilityKeySchema, "AbilityKey"],
  [AnyConditionSchema, "AnyCondition"],
  [SpellFxSchema, "SpellFx"],
  [WeaponStatsSchema, "WeaponStats"],
  [ArmorStatsSchema, "ArmorStats"],
  [ItemStatsSchema, "ItemStats"],
  [ClassColumnSchema, "ClassColumn"],
  [RulesetPatchSchema, "RulesetPatch"],
];

const stripMeta = (s: object): Record<string, unknown> => {
  const { $schema: _s, $id: _i, ...rest } = s as Record<string, unknown>;

  return rest;
};

export const inputJsonSchema = (schema: ZodType) => stripMeta(z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }));

export function toJsonSchemas(entries: ReadonlyArray<Entry>, opts: { uriPrefix?: string } = {}): Record<string, Record<string, unknown>> {
  const prefix = opts.uriPrefix ?? "#/components/schemas/";

  const registry = z.registry<{ id: string }>();

  for (const [schema, id] of [...SHARED_SCHEMAS, ...entries]) {
    if (!registry.has(schema)) registry.add(schema, { id });
  }

  const { schemas } = z.toJSONSchema(registry, { io: "input", unrepresentable: "any", uri: (id) => `${prefix}${id}` });

  return Object.fromEntries(Object.entries(schemas).map(([id, s]) => [id, stripMeta(s)]));
}
