import { z, type ZodType } from "zod";

import "server-only";
import { AbilitySchema, LimitsSchema } from "@/lib/utils/abilities/schema/ability";
import { ConditionSchema } from "@/lib/utils/abilities/schema/conditions";
import { EffectSchema, NonRandomEffectSchema } from "@/lib/utils/abilities/schema/effects";
import { TriggerSchema } from "@/lib/utils/abilities/schema/triggers";
import { WeaponStatsSchema } from "@/lib/utils/artifacts/weapon-stats";
import { SpellFxSchema } from "@/lib/utils/battle/fx/spell-fx-schema";
import { RulesetPatchSchema } from "@/lib/utils/rules/schema";

type Entry = readonly [ZodType, string];

// the discriminator value lives in _zod.propValues; refined members (summon) have no .shape
const effectKind = (s: ZodType) => [...(s._zod as unknown as { propValues: { kind: Set<string> } }).propValues.kind][0];

export const SHARED_SCHEMAS: ReadonlyArray<Entry> = [
  [AbilitySchema, "Ability"],
  [TriggerSchema, "Trigger"],
  [ConditionSchema, "Condition"],
  [LimitsSchema, "AbilityLimits"],
  [EffectSchema, "Effect"],
  [NonRandomEffectSchema, "NonRandomEffect"],
  ...(NonRandomEffectSchema.options as readonly ZodType[]).map((s): Entry => [s, `Effect.${effectKind(s)}`]),
  [SpellFxSchema, "SpellFx"],
  [WeaponStatsSchema, "WeaponStats"],
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
