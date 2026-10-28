import { convertArtifacts } from "../convert/artifacts";
import { convertClasses } from "../convert/classes";
import { convertRaces } from "../convert/races";
import { convertSpellGroups } from "../convert/spell-groups";
import { convertSpells } from "../convert/spells";
import { convertUnits } from "../convert/units";
import { CLASS_FEATURE_OVERRIDES, DROP_FEATURES, FEATURE_LEVELS, SPELLCASTING_ABILITY } from "../overrides/classes";
import { RACE_OVERRIDES } from "../overrides/races";
import { SPELL_OVERRIDES } from "../overrides/spells";
import { UNIT_OVERRIDES } from "../overrides/units";
import type { Open5eData } from "./open5e";
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
  assertKnown("class feature overrides", [...Object.keys(CLASS_FEATURE_OVERRIDES), ...Object.keys(FEATURE_LEVELS), ...DROP_FEATURES], pks(data.features));
  assertKnown("spellcasting abilities", Object.keys(SPELLCASTING_ABILITY), pks(data.classes));
  assertKnown("unit overrides", Object.keys(UNIT_OVERRIDES), pks(data.creatures));

  const out: SrdData = {
    "spell-groups": convertSpellGroups(),
    spells: convertSpells(data),
    races: convertRaces(data),
    classes: convertClasses(data),
    units: convertUnits(data),
    artifacts: convertArtifacts(data),
  };

  for (const kind of SRD_KINDS) assertUniqueSlugs(kind, out[kind]);

  return out;
}
