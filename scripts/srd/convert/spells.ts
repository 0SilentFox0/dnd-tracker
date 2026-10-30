import { type Fixture, type O5CastingOption, type O5Spell, type Open5eData } from "../lib/open5e";
import { bySlug, parseDiceExpr, titleCase } from "../lib/text";
import type { SpellRow } from "../lib/types";
import { SPELL_OVERRIDES } from "../overrides/spells";
import { schoolName } from "./spell-groups";

import { parseMaterial } from "@/lib/server/compendium-import/adapters/spell-patterns/ingredients";
import { groupBy } from "@/lib/utils/common/collections";
import { capitalize } from "@/lib/utils/common/text";
import { ADDS_MOD, castingFields, spellEffects, spellHead, spellKind, spellResolution, spellSide, spellTargeting, spellUpcast, validDice } from "@/lib/utils/spells/derive/mechanics";

export { durationRounds, spellKind, spellRange } from "@/lib/utils/spells/derive/mechanics";

const CASTING_TIME: Record<string, string> = { action: "Action", "bonus-action": "Bonus Action", reaction: "Reaction", "1minute": "1 minute", "10minutes": "10 minutes", "1hour": "1 hour" };

function materials(f: O5Spell): Pick<SpellRow, "componentFlags" | "ingredients"> {
  const componentFlags = { v: f.verbal, s: f.somatic, m: f.material };

  const parsed = f.material && f.material_specified ? parseMaterial({ text: f.material_specified, consume: f.material_consumed || undefined }) : null;

  return { componentFlags, ingredients: parsed ?? [] };
}

function description(f: O5Spell): string {
  const components = [f.verbal && "V", f.somatic && "S", f.material && `M${f.material_specified ? ` (${f.material_specified})` : ""}`].filter(Boolean).join(", ");

  const school = titleCase(f.school);

  const head = spellHead({ level: f.level, school, casting: CASTING_TIME[f.casting_time] ?? f.casting_time, ritual: f.ritual, range: f.range_text, components, duration: capitalize(f.duration), concentration: f.concentration, classes: f.classes.map((c) => titleCase(c.replace(/^srd-2024_/, ""))) });

  const higher = f.higher_level ? `${f.level === 0 ? "Cantrip Upgrade." : "Using a Higher-Level Spell Slot."} ${f.higher_level}` : null;

  return [head, f.desc.trim(), higher].filter(Boolean).join("\n\n");
}

export function convertSpell(row: Fixture<O5Spell>, options: Array<Fixture<O5CastingOption, number>>): SpellRow {
  const f = row.fields;

  const kind = spellKind(f);

  const targeting = spellTargeting(f, spellSide(f, kind), kind);

  const dice = kind === "damage" || kind === "heal" ? validDice(f) : null;

  const base: SpellRow = {
    slug: row.pk,
    name: f.name,
    level: f.level,
    groupId: schoolName(f.school),
    description: description(f),
    ...castingFields(f.casting_time, f.reaction_condition),
    dice: dice?.count ?? 0,
    ...(dice && { dieSides: dice.sides as SpellRow["dieSides"] }),
    concentration: f.concentration,
    ritual: f.ritual,
    ...materials(f),
    ...spellUpcast(f, kind, options.filter((o) => o.fields.type.startsWith("slot_level_")).map((o) => ({ level: Number(o.fields.type.slice("slot_level_".length)), dice: parseDiceExpr(o.fields.damage_roll) }))),
    ...(kind === "heal" && ADDS_MOD.test(f.desc) && { addAbilityMod: true }),
    targeting,
    resolution: spellResolution(f, kind, targeting),
    spellEffects: spellEffects(f, kind),
    lists: f.classes.map((c) => titleCase(c.replace(/^srd-2024_/, ""))),
  };

  return { ...base, ...SPELL_OVERRIDES[row.pk] };
}

export function convertSpells(data: Open5eData): SpellRow[] {
  const options = groupBy(data.castingOptions, (o) => o.fields.parent);

  return data.spells.map((s) => convertSpell(s, options.get(s.pk) ?? [])).sort(bySlug);
}
