import { convertArtifacts } from "../convert/artifacts";
import { applyClassChoices } from "../convert/class-choices";
import { convertClasses } from "../convert/classes";
import { convertFeats } from "../convert/feats";
import { convertMagicItems } from "../convert/magic-items";
import { applyRaceChoices } from "../convert/race-choices";
import { convertRaces } from "../convert/races";
import { convertSpellGroups } from "../convert/spell-groups";
import { convertSpells } from "../convert/spells";
import { convertUnits } from "../convert/units";
import { EXTRA_CHOICES } from "../overrides/class-choices";
import { CLASS_FEATURE_OVERRIDES, COLUMN_FEATURES, COLUMN_LABELS, DROP_COLUMNS, DROP_FEATURES, EXTRA_COLUMNS, FEATURE_LEVELS, POOL_COLUMNS, SINGLE_LEVEL_FEATURES, SPELLCASTING_ABILITY } from "../overrides/classes";
import { FEAT_MECHANICS } from "../overrides/feats";
import { BELT_STRENGTH, DRAGON_SLAYER_PK, DROPPED_GENERIC, UNIQUE_BASES } from "../overrides/magic-items";
import { DROP_RACE_TRAITS, RACE_CHOICE_TRAITS } from "../overrides/race-choices";
import { RACE_OVERRIDES } from "../overrides/races";
import { SPELL_OVERRIDES } from "../overrides/spells";
import { UNIT_OVERRIDES } from "../overrides/units";
import type { Open5eData } from "./open5e";
import { bySlug } from "./text";
import { SRD_KINDS, type SrdData } from "./types";

export function assertUniqueSlugs(kind: string, rows: ReadonlyArray<{ slug: string }>): void {
  const seen = new Set<string>();

  for (const { slug } of rows) {
    if (!slug) throw new Error(`${kind}: empty slug`);

    if (seen.has(slug)) throw new Error(`${kind}: duplicate slug ${slug}`);

    seen.add(slug);
  }
}

export function assertKnown(label: string, keys: readonly string[], known: ReadonlySet<string>): void {
  const unknown = keys.filter((k) => !known.has(k));

  if (unknown.length > 0) throw new Error(`${label}: unknown ${unknown.join(", ")}`);
}

export function buildSrdData(data: Open5eData): SrdData {
  const pks = (rows: ReadonlyArray<{ pk: string }>) => new Set(rows.map((r) => r.pk));

  assertKnown("spell overrides", Object.keys(SPELL_OVERRIDES), pks(data.spells));
  assertKnown("race overrides", Object.keys(RACE_OVERRIDES), pks(data.speciesTraits));
  assertKnown("race choice traits", [...Object.keys(RACE_CHOICE_TRAITS), ...DROP_RACE_TRAITS], pks(data.speciesTraits));
  assertKnown("class feature overrides", [...Object.keys(CLASS_FEATURE_OVERRIDES), ...Object.keys(FEATURE_LEVELS), ...DROP_FEATURES, ...COLUMN_FEATURES, ...DROP_COLUMNS, ...Object.keys(COLUMN_LABELS), ...Object.keys(POOL_COLUMNS), ...SINGLE_LEVEL_FEATURES], pks(data.features));
  assertKnown("extra class columns", Object.keys(EXTRA_COLUMNS), pks(data.classes));
  assertKnown("spellcasting abilities", Object.keys(SPELLCASTING_ABILITY), pks(data.classes));
  assertKnown("extra class choices", Object.keys(EXTRA_CHOICES), pks(data.classes));
  assertKnown("unit overrides", Object.keys(UNIT_OVERRIDES), pks(data.creatures));

  if (data.magicItems.length > 0) assertKnown("magic item overrides", [...Object.keys(UNIQUE_BASES), ...Object.keys(BELT_STRENGTH), DRAGON_SLAYER_PK, ...DROPPED_GENERIC], pks(data.magicItems));

  if (data.feats.length > 0) assertKnown("feat overrides", Object.keys(FEAT_MECHANICS), pks(data.feats));

  const out: SrdData = {
    "spell-groups": convertSpellGroups(),
    spells: convertSpells(data),
    races: applyRaceChoices(convertRaces(data), data),
    classes: applyClassChoices(convertClasses(data)),
    feats: convertFeats(data),
    units: convertUnits(data),
    artifacts: (() => {
      const gear = convertArtifacts(data);

      return [...gear, ...convertMagicItems(data, gear)].sort(bySlug);
    })(),
  };

  const spellNames = new Set(out.spells.map((s) => s.name));

  assertKnown("race choice spells", out.races.flatMap((r) => (r.choices ?? []).flatMap((c) => (c.options ?? []).flatMap((o) => (o.spells ?? []).map((s) => s.spellId)))), spellNames);

  for (const kind of SRD_KINDS) assertUniqueSlugs(kind, out[kind]);

  return out;
}
