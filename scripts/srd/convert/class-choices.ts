import { coreAbility, noteAbility } from "../lib/abilities";
import { slugTail } from "../lib/open5e";
import type { ClassFeatureGroup, ClassRow } from "../lib/types";
import { BINARY_FEATURES, EXPERTISE_FEATURES, EXTRA_CHOICES, FEAT_FEATURES, INVOCATION_MECHANICS, RESISTANCE_FEATURES, SKILL_FEATURES, SPELL_FEATURES } from "../overrides/class-choices";
import { SPELLCASTING_ABILITY } from "../overrides/classes";

import type { Ability } from "@/lib/utils/abilities/schema";
import { choiceSlug } from "@/lib/utils/characters/choices/slug";
import { capitalize } from "@/lib/utils/common/text";
import type { Choice, ChoiceOption } from "@/types/choices";

const tailOf = (abilityId: string) => abilityId.replace(/-\d+$/, "");

export function headingSections(desc: string): Array<{ title: string; body: string }> {
  return desc
    .split(/^### /m)
    .slice(1)
    .map((chunk) => {
      const [title, ...rest] = chunk.split("\n");

      return { title: title.replace(/\*/g, "").trim(), body: rest.join("\n").trim() };
    });
}

export const boldOptions = (desc: string): Array<{ name: string; text: string }> => [...desc.matchAll(/\*\*(.+?)\.\*\*\s*([^\n]+)/g)].map(([, name, text]) => ({ name: name.trim(), text: text.trim() }));

const resistance = (type: string, description: string): Ability => coreAbility("resistance", `Resistance (${capitalize(type)})`, description, { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: type, percent: 50 }] });

function invocationOptions(desc: string): ChoiceOption[] {
  const sections = headingSections(desc);

  const ids = new Set(sections.map((s) => choiceSlug(s.title)));

  return sections.map(({ title, body }) => {
    const id = choiceSlug(title);

    const prereq = /\*Prerequisite: ([^*]+)\*/.exec(body)?.[1]?.trim();

    const minLevel = prereq ? /Level (\d+)\+ Warlock/.exec(prereq)?.[1] : undefined;

    const requires = prereq ? [...prereq.matchAll(/([A-Z][\w' ]+?) Invocation/g)].map((m) => choiceSlug(m[1].trim())).filter((r) => ids.has(r) && r !== id) : [];

    const text = body.replace(/\*Prerequisite: [^*]+\*\s*/, "").trim();

    const description = prereq ? `Prerequisite: ${prereq}\n\n${text}` : text;

    const mech = INVOCATION_MECHANICS[id];

    return { id, name: title, description, ...(minLevel && { minLevel: Number(minLevel) }), ...(requires.length > 0 && { requires }), abilities: [mech ? coreAbility(id, title, text, mech) : noteAbility(id, title, text)] };
  });
}

interface Ctx {
  classTail: string;
  skillFrom: ClassRow["skillChoices"]["from"];
  find: (tail: string) => Ability | undefined;
}

/** перетворює вміння-нотатку на вибір; null — вміння лишається як є */
function abilityChoice(a: Ability, level: number, ctx: Ctx): { choice: Choice; keep: boolean } | null {
  const tail = tailOf(a.id);

  const base = { id: a.id, label: a.name, description: a.description ?? "", level, count: 1 as number | { scale: string } };

  const feat = FEAT_FEATURES[tail];

  if (feat) {
    const embedded = feat.embedded ? boldOptions(a.description ?? "").map((o) => ({ id: choiceSlug(o.name), name: o.name, description: o.text, abilities: [noteAbility(choiceSlug(o.name), o.name, o.text)] })) : [];

    return { choice: { ...base, kind: "feat", featTypes: feat.featTypes, ...(embedded.length > 0 && { options: embedded }) }, keep: false };
  }

  const key = `${ctx.classTail}:${tail}`;

  const expertise = EXPERTISE_FEATURES[key];

  if (expertise) return { choice: { ...base, kind: "expertise", count: expertise.count, ...(expertise.skills && { skills: expertise.skills }) }, keep: !!expertise.keepAbility };

  const skill = SKILL_FEATURES[key];

  if (skill) return { choice: { ...base, kind: "skill", count: skill.count, ...(skill.fromClass && { skills: ctx.skillFrom }) }, keep: !!skill.keepAbility };

  const spell = SPELL_FEATURES[key];

  if (spell) {
    const { count, ...spells } = spell;

    return { choice: { ...base, kind: "spell", count, spells }, keep: false };
  }

  const binary = BINARY_FEATURES[tail];

  if (binary) {
    const options = boldOptions(a.description ?? "").map((o) => {
      const id = choiceSlug(o.name);

      return { id, name: o.name, description: o.text, abilities: [binary[id] ? coreAbility(id, o.name, o.text, binary[id]) : noteAbility(id, o.name, o.text)] };
    });

    return { choice: { ...base, kind: "option", options }, keep: false };
  }

  const types = RESISTANCE_FEATURES[tail];

  if (types) return { choice: { ...base, kind: "option", options: types.map((t) => ({ id: t, name: capitalize(t), abilities: [resistance(t, a.description ?? "")] })) }, keep: false };

  if (tail === "metamagic" && level === 2) {
    const options = headingSections(ctx.find("metamagic-options")?.description ?? "").map(({ title, body }) => ({ id: choiceSlug(title), name: title, description: body, abilities: [noteAbility(choiceSlug(title), title, body)] }));

    return { choice: { ...base, id: "metamagic", count: { scale: "metamagic" }, kind: "option", options }, keep: false };
  }

  if (tail === "eldritch-invocations") return { choice: { ...base, id: "eldritch-invocations", count: { scale: "eldritch-invocation-count" }, kind: "option", options: invocationOptions(ctx.find("eldritch-invocation-options")?.description ?? "") }, keep: false };

  return null;
}

const DROPPED_TAILS = new Set(["metamagic", "metamagic-options", "eldritch-invocation-options"]);

function transform(groups: ClassFeatureGroup[], ctx: Ctx): ClassFeatureGroup[] {
  return groups.map((g) => {
    const choices: Choice[] = [...(g.choices ?? [])];

    const abilities = g.abilities.filter((a) => {
      const made = abilityChoice(a, g.level, ctx);

      if (made) choices.push(made.choice);

      return made ? made.keep : !DROPPED_TAILS.has(tailOf(a.id));
    });

    return { level: g.level, abilities, ...(choices.length > 0 && { choices }) };
  });
}

function spellChoices(c: ClassRow): Choice[] {
  const has = (key: string) => c.columns.some((col) => col.key === key);

  return [
    ...(has("cantrips") ? [{ id: "cantrips", label: "Cantrips", level: 1, count: { scale: "cantrips" }, kind: "spell" as const, spells: { lists: [c.name], minLevel: 0, maxLevel: 0 } }] : []),
    ...(has("prepared-spells") ? [{ id: "prepared-spells", label: "Prepared Spells", level: 1, count: { scale: "prepared-spells" }, kind: "spell" as const, spells: { lists: [c.name], minLevel: 1, maxLevel: "slots" as const } }] : []),
  ];
}

function addAt(groups: ClassFeatureGroup[], extra: Choice[]): ClassFeatureGroup[] {
  const out = groups.map((g) => ({ ...g }));

  for (const choice of extra) {
    const group = out.find((g) => g.level === choice.level);

    if (group) group.choices = [...(group.choices ?? []), choice];
    else out.push({ level: choice.level, abilities: [], choices: [choice] });
  }

  return out.sort((a, b) => a.level - b.level);
}

export function applyClassChoices(rows: ClassRow[]): ClassRow[] {
  return rows.map((c) => {
    const all = [...c.features, ...c.subclasses.flatMap((s) => s.features)].flatMap((g) => g.abilities);

    const ctx: Ctx = { classTail: slugTail(c.slug), skillFrom: c.skillChoices.from, find: (tail) => all.find((a) => tailOf(a.id) === tail) };

    const caster = !!SPELLCASTING_ABILITY[c.slug];

    const features = addAt(transform(c.features, ctx), [...(caster ? spellChoices(c) : []), ...(EXTRA_CHOICES[c.slug] ?? [])]);

    return { ...c, ...(caster && { spellList: c.name }), features, subclasses: c.subclasses.map((s) => ({ ...s, features: transform(s.features, ctx) })) };
  });
}
