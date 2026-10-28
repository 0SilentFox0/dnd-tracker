import { coreAbility, noteAbility } from "../lib/abilities";
import { type Fixture, type O5SpeciesTrait, type Open5eData, slugTail } from "../lib/open5e";
import type { RaceRow } from "../lib/types";
import { DROP_RACE_TRAITS, OPTION_ABILITIES, RACE_CHOICE_TRAITS, type RaceChoiceTrait } from "../overrides/race-choices";

import type { Ability } from "@/lib/utils/abilities/schema";
import { choiceSlug } from "@/lib/utils/characters/choices/slug";
import { capitalize } from "@/lib/utils/common/text";
import type { Choice, ChoiceOption } from "@/types/choices";

interface Parsed {
  name: string;
  description: string;
  spells: Array<{ level: number; spellId: string }>;
  damage?: string;
  abilityName?: string;
}

export function tableRows(desc: string): string[][] {
  return desc
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|") && !/^\|\s*-/.test(l))
    .slice(1)
    .map((l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
}

const knownCantrip = (cell: string) => /know the (.+?) cantrip/i.exec(cell)?.[1];

const resistanceIn = (cell: string) => /Resistance to (\w+) damage/i.exec(cell)?.[1]?.toLowerCase();

const italics = (text: string) => [...new Set([...text.matchAll(/(?<!\*)\*([^*]+)\*(?!\*)/g)].map((m) => m[1].trim()))];

function parseLineage(desc: string, parse: Extract<RaceChoiceTrait, { kind: "lineage" }>["parse"]): Parsed[] {
  if (parse === "levels") {
    return tableRows(desc).map(([name, l1, l3, l5]) => {
      const cantrip = knownCantrip(l1);

      return { name, description: l1, spells: [...(cantrip ? [{ level: 1, spellId: cantrip }] : []), { level: 3, spellId: l3 }, { level: 5, spellId: l5 }], damage: resistanceIn(l1) };
    });
  }

  if (parse === "damage") return tableRows(desc).map(([name, type]) => ({ name, description: `Damage type: ${type}`, spells: [], damage: type.toLowerCase() }));

  if (parse === "bold") {
    return [...desc.matchAll(/\*\*(.+?)\.\*\*\s*([^\n]+)/g)].map(([, name, text]) => ({ name, description: text.trim(), spells: italics(text).map((spellId) => ({ level: 1, spellId })) }));
  }

  return [...desc.matchAll(/^- \*\*(.+?) \((.+?)\)\*\*\.\s*(.+)$/gm)].map(([, abilityName, name, text]) => ({ name, abilityName, description: text.trim(), spells: [] }));
}

function toOption(p: Parsed, raceTail: string, breath: boolean): ChoiceOption {
  const id = choiceSlug(p.name);

  const extra = OPTION_ABILITIES[`${raceTail}:${id}`];

  const abilities: Ability[] = [
    ...(p.damage ? [coreAbility("resistance", `Damage Resistance (${capitalize(p.damage)})`, p.description, { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: p.damage, percent: 50 }] })] : []),
    ...(breath && p.damage ? [noteAbility("breath-weapon", `Breath Weapon (${capitalize(p.damage)})`, `Your Breath Weapon deals ${capitalize(p.damage)} damage.`)] : []),
    ...(extra ?? []).map((a) => coreAbility(a.id, a.name, p.description, a.core)),
    ...(!extra && p.abilityName ? [noteAbility(choiceSlug(p.abilityName), p.abilityName, p.description)] : []),
  ];

  return { id, name: p.name, description: p.description, abilities, ...(p.spells.length > 0 && { spells: p.spells }) };
}

function traitChoice(t: Fixture<O5SpeciesTrait>, spec: RaceChoiceTrait, raceTail: string): Choice {
  const base = { id: slugTail(t.pk), label: t.fields.name, description: t.fields.desc.trim(), level: 1, count: 1 };

  if (spec.kind === "skill") return { ...base, kind: "skill", ...(spec.skills && { skills: spec.skills }) };

  if (spec.kind === "feat") return { ...base, kind: "feat", featTypes: spec.featTypes };

  const parsed = parseLineage(t.fields.desc, spec.parse);

  if (parsed.length === 0) throw new Error(`${t.pk}: no lineage options parsed`);

  return { ...base, kind: "option", lineage: true, options: parsed.map((p) => toOption(p, raceTail, !!spec.breath)) };
}

export function applyRaceChoices(rows: RaceRow[], data: Open5eData): RaceRow[] {
  const traits = data.speciesTraits.filter((t) => RACE_CHOICE_TRAITS[t.pk] || DROP_RACE_TRAITS.has(t.pk));

  return rows.map((race) => {
    const own = traits.filter((t) => t.fields.parent === race.slug).sort((a, b) => a.fields.order - b.fields.order);

    if (own.length === 0) return race;

    const drop = new Set(own.map((t) => slugTail(t.pk)));

    const choices = own.flatMap((t) => {
      const spec = RACE_CHOICE_TRAITS[t.pk];

      return spec ? [traitChoice(t, spec, slugTail(race.slug))] : [];
    });

    return { ...race, abilities: race.abilities.filter((a) => !drop.has(a.id)), ...(choices.length > 0 && { choices }) };
  });
}
