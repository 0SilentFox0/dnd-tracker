import { describe, expect, it } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { optionSetKey } from "@/components/abilities/fields/registry-labels";
import { LOCALES } from "@/lib/i18n/config";
import { localSource } from "@/lib/i18n/local-source";
import { CONDITION_REGISTRY } from "@/lib/utils/abilities/registry/conditions";
import { EFFECT_REGISTRY } from "@/lib/utils/abilities/registry/effects";
import { FLAG_FIELDS, FLAG_KEYS } from "@/lib/utils/abilities/registry/effects/flags";
import { DURATION_FIELD, type FieldMeta, TARGET_FIELD } from "@/lib/utils/abilities/registry/fields";
import { TARGET_KEYS } from "@/lib/utils/abilities/registry/labels";
import { TRIGGER_REGISTRY } from "@/lib/utils/abilities/registry/triggers";
import { DAMAGE_FILTER_KINDS, STAT_KEYS } from "@/lib/utils/abilities/schema/kinds";
import { ABILITY_TEMPLATES } from "@/lib/utils/abilities/templates";

const keys = <T extends object>(o: T) => Object.keys(o);

const lookup = (tree: unknown, path: string) => path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], tree);

const owners: { owner: string; fields: readonly FieldMeta[] }[] = [
  ...Object.entries(EFFECT_REGISTRY).map(([k, d]) => ({ owner: `effects.${k}`, fields: d.fields })),
  ...Object.entries(FLAG_FIELDS).map(([k, f]) => ({ owner: `flags.${k}`, fields: [...f, TARGET_FIELD, DURATION_FIELD] })),
  ...Object.entries(TRIGGER_REGISTRY).map(([k, d]) => ({ owner: `triggers.${k}`, fields: d.fields })),
  ...Object.entries(CONDITION_REGISTRY).map(([k, d]) => ({ owner: `conditionTypes.${k}`, fields: d.fields })),
];

describe("ability registry labels have translations", () => {
  expectLabelKeys("abilityRegistry", "stats", [...STAT_KEYS]);
  expectLabelKeys("abilityRegistry", "targets", [...TARGET_KEYS]);
  expectLabelKeys("abilityRegistry", "damageFilters", [...DAMAGE_FILTER_KINDS]);
  expectLabelKeys("abilityRegistry", "optionGroups", ["conditions5e", "mechanicalConditions"]);

  for (const [prefix, registry] of [["effects", EFFECT_REGISTRY], ["triggers", TRIGGER_REGISTRY], ["conditionTypes", CONDITION_REGISTRY], ["flags", Object.fromEntries(FLAG_KEYS.map((k) => [k, k]))]] as const) {
    expectLabelKeys("abilityRegistry", prefix, keys(registry).map((id) => `${id}.label`));
  }

  expectLabelKeys("abilityRegistry", "templates", ABILITY_TEMPLATES.flatMap((t) => [`${t.id}.label`, `${t.id}.hint`, `${t.id}.defaultName`]));

  for (const locale of LOCALES) {
    it(`${locale}: every field label and option resolves (own key or shared)`, async () => {
      const tree = await localSource.load(locale, "abilityRegistry");

      const has = (...paths: string[]) => paths.some((p) => typeof lookup(tree, p) === "string");

      for (const { owner, fields } of owners) {
        for (const f of fields) {
          expect(has(`${owner}.fields.${f.name}`, `fields.${f.name}`), `${owner} field ${f.name}`).toBe(true);

          if (owner === "effects.flag" && f.name === "flag") continue;

          for (const o of f.options ?? []) {
            const set = optionSetKey(f.name);

            expect(has(`${owner}.${set}.${o.value}`, `${set}.${o.value}`), `${owner} option ${f.name}.${o.value}`).toBe(true);
          }
        }
      }
    });
  }
});
