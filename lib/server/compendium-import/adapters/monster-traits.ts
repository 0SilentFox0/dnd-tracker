import { renderEntries } from "../entries";
import { type CompendiumRef, type Edition } from "../types";
import { plainName, spellRefs } from "./monster-attacks";
import { ABILITIES, array, num, object, str } from "./shared";

import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { type Ability, AnyConditionSchema, type Effect } from "@/lib/utils/abilities/schema";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import type { UnitSpellcasting } from "@/types/units";

const DAMAGE_TYPES = new Set(["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"]);

const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export interface Defenses { abilities: Ability[]; unresolved: string[]; nonMagicalApprox: boolean }

function flatten(raw: unknown, key: string, out: { values: string[]; unresolved: string[]; conditional: boolean }, conditional = false) {
  for (const entry of array(raw)) {
    if (typeof entry === "string") {
      out.values.push(entry.toLowerCase());
      out.conditional ||= conditional;
    } else {
      const obj = object(entry);

      const nested = obj[key];

      if (Array.isArray(nested)) flatten(nested, key, out, conditional || obj.cond === true || typeof obj.note === "string");
      else if (typeof obj.special === "string" && (DAMAGE_TYPES.has(obj.special.toLowerCase()) || key === "conditionImmune")) out.values.push(obj.special.toLowerCase());
      else out.unresolved.push(`${key}: ${JSON.stringify(entry)}`);
    }
  }
}

export function defenseAbilities(row: Record<string, unknown>): Defenses {
  const abilities: Ability[] = [];

  const unresolved: string[] = [];

  let nonMagicalApprox = false;

  const damage: Array<[string, string, number]> = [["resist", "Damage Resistances", 50], ["immune", "Damage Immunities", 100], ["vulnerable", "Damage Vulnerabilities", -100]];

  for (const [key, name, percent] of damage) {
    if (row[key] === undefined) continue;

    const out = { values: [] as string[], unresolved, conditional: false };

    flatten(row[key], key, out);

    const types = [...new Set(out.values.filter((v) => DAMAGE_TYPES.has(v)))];

    unresolved.push(...out.values.filter((v) => !DAMAGE_TYPES.has(v)).map((v) => `${key}: ${v}`));

    nonMagicalApprox ||= out.conditional;

    if (types.length > 0) abilities.push({ id: key === "resist" ? "damage-resistances" : key === "immune" ? "damage-immunities" : "damage-vulnerabilities", name, description: types.map(title).join(", "), trigger: { event: "passive" }, effects: types.map((damageType): Effect => ({ kind: "flag", flag: "resistance", damageType, percent })) });
  }

  if (row.conditionImmune !== undefined) {
    const out = { values: [] as string[], unresolved, conditional: false };

    flatten(row.conditionImmune, "conditionImmune", out);

    const valid = [...new Set(out.values)].filter((v) => AnyConditionSchema.safeParse(v).success);

    unresolved.push(...out.values.filter((v) => !valid.includes(v)).map((v) => `conditionImmune: ${v}`));

    if (valid.length > 0) abilities.push({ id: "condition-immunities", name: "Condition Immunities", description: valid.map(title).join(", "), trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "conditionImmunity", conditions: valid as never }] });
  }

  return { abilities, unresolved, nonMagicalApprox };
}

export function saveProficiencies(raw: unknown, scores: Partial<Record<AbilityKey, number>> | null): AbilityKey[] {
  const saves = object(raw);

  return ABILITY_KEYS.filter((key) => {
    const short = Object.entries(ABILITIES).find(([, long]) => long === key)?.[0] ?? "";

    const total = Number(str(saves[short]).replace(/^\+/, ""));

    return Number.isFinite(total) && scores?.[key] !== undefined && total > getAbilityModifier(scores[key]);
  });
}

export function legendaryResistances(traits: unknown): { count: number; lair?: number } | undefined {
  for (const trait of array(traits)) {
    const name = str(object(trait).name);

    const m = /^Legendary Resistance \((\d+)\/Day/i.exec(name);

    if (m) return { count: Number(m[1]), ...(/or (\d+)\/Day in Lair/i.exec(name) && { lair: Number(/or (\d+)\/Day in Lair/i.exec(name)?.[1]) }) };
  }
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function legendaryAbilities(raw: unknown, attackNames: readonly string[]): { abilities: Ability[]; manual: string[] } {
  const abilities: Ability[] = [];

  const manual: string[] = [];

  for (const [index, value] of array(raw).entries()) {
    const entry = object(value);

    const name = plainName(str(entry.name)).replace(/\s*\(Costs? (\d) Actions?\)/i, "");

    if (!name) continue;

    const cost = Number(/\(Costs? (\d) Actions?\)/i.exec(str(entry.name))?.[1] ?? 1);

    const text = renderEntries(entry.entries).text;

    const choice = /makes (?:a|an|one) ([^.]+?) attack/i.exec(text)?.[1].toLowerCase();

    const attack = attackNames.find((n) => choice?.split(/ or /).some((c) => c.trim() === n.toLowerCase()));

    if (!attack) manual.push(name);

    abilities.push({ id: `legendary-${slug(name) || index}`, name, description: text, trigger: { event: "action" }, limits: { legendaryCost: Math.min(3, Math.max(1, cost)) }, ...(attack && { perform: { kind: "attack", attack } }), effects: [{ kind: "note", text: name }] });
  }

  return { abilities, manual };
}

interface Grant { name: string; source: string; perBattle?: number; castLevel?: number; dc?: number }

export interface Casting { config: UnitSpellcasting; refs: CompendiumRef[]; approximate: boolean; unresolved: string[] }

const defaultSource = (edition: Edition) => edition === "one" ? "XPHB" : "PHB";

export class CastingBuilder {
  private grants: Grant[] = [];

  private config: Omit<UnitSpellcasting, "spells"> = {};

  private approximate = false;

  private unresolved: string[] = [];

  constructor(private edition: Edition) {}

  private header(text: string) {
    const ability = /spellcasting ability is (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)|using (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) as (?:its |the )?spellcasting ability/i.exec(text);

    const dc = /\{@dc (\d+)\}|spell save DC (?:is )?(\d+)/i.exec(text);

    const attack = /\{@hit (-?\d+)\} to hit with spell attacks/i.exec(text);

    this.config.ability ??= (ability?.[1] ?? ability?.[2])?.toLowerCase() as AbilityKey | undefined;
    this.config.dc ??= dc ? Number(dc[1] ?? dc[2]) : undefined;
    this.config.attackBonus ??= attack ? Number(attack[1]) : undefined;
  }

  private add(text: string, extra: Omit<Grant, "name" | "source">) {
    for (const ref of spellRefs(text)) this.grants.push({ name: ref.name, source: ref.source || defaultSource(this.edition), ...extra });
  }

  block(raw: unknown) {
    const block = object(raw);

    this.header(array(block.headerEntries).filter((e): e is string => typeof e === "string").join(" "));

    const short = str(block.ability);

    if (ABILITIES[short]) this.config.ability ??= ABILITIES[short] as AbilityKey;

    for (const text of array(block.headerEntries)) if (typeof text === "string" && /^(?:At will|\d\/day)/i.test(text)) this.inlineList(text);

    for (const spell of array(block.will)) this.add(typeof spell === "string" ? spell : str(object(spell).entry), {});

    for (const [key, list] of Object.entries(object(block.daily))) {
      const uses = Number(key.replace(/\D/g, ""));

      for (const spell of array(list)) this.add(typeof spell === "string" ? spell : str(object(spell).entry), { perBattle: Math.min(9, Math.max(1, uses)) });
    }

    for (const [level, group] of Object.entries(object(block.spells))) {
      const { slots, spells } = object(group) as { slots?: number; spells?: unknown[] };

      const castLevel = Number(level);

      if (castLevel > 0 && num(slots) !== undefined) this.approximate = true;

      for (const spell of array(spells)) this.add(str(spell), castLevel > 0 ? { castLevel, ...(num(slots) !== undefined && { perBattle: Math.min(9, Math.max(1, slots as number)) }) } : {});
    }

    for (const key of ["rest", "weekly", "yearly", "charges", "recharge", "ritual", "constant"]) if (block[key] !== undefined) this.unresolved.push(`spellcasting.${key}`);
  }

  private inlineList(text: string) {
    const m = /^(at will|(\d)\/day(?: each)?)\s*:\s*(.*)$/i.exec(text);

    if (m) this.add(m[3], m[2] ? { perBattle: Number(m[2]) } : {});
  }

  action(name: string, text: string) {
    const refs = spellRefs(text);

    if (refs.length === 0 || !/\bcasts?\b/i.test(text)) return false;

    this.header(text);

    const uses = /\((\d+)\/Day\)/i.exec(name)?.[1];

    const dc = /\{@dc (\d+)\}|spell save DC (?:is )?(\d+)/i.exec(text);

    this.add(text, { ...(uses && { perBattle: Number(uses) }), ...(dc && { dc: Number(dc[1] ?? dc[2]) }) });

    return true;
  }

  build(): Casting | undefined {
    const seen = new Map<string, Grant>();

    for (const grant of this.grants) {
      const key = `${grant.name.toLowerCase()}|${grant.source.toLowerCase()}`;

      const prior = seen.get(key);

      if (!prior || (prior.perBattle !== undefined && grant.perBattle === undefined)) seen.set(key, grant);
    }

    if (seen.size === 0) return;

    const grants = [...seen.values()].slice(0, 60);

    const spells = grants.map((g) => ({ spellId: g.name, ...(g.perBattle !== undefined && { perBattle: g.perBattle }), ...(g.castLevel && { castLevel: Math.min(9, g.castLevel) }), ...(g.dc !== undefined && g.dc >= 5 && g.dc <= 30 && { dc: g.dc }) }));

    const { ability, dc, attackBonus } = this.config;

    const config: UnitSpellcasting = { ...(ability && { ability }), ...(dc !== undefined && dc >= 5 && dc <= 30 && { dc }), ...(attackBonus !== undefined && attackBonus >= -5 && attackBonus <= 20 && { attackBonus }), spells };

    const refs = grants.map((g, i): CompendiumRef => ({ path: ["spellcasting", "spells", i, "spellId"], kind: "spell", name: g.name, source: g.source, edition: this.edition }));

    return { config, refs, approximate: this.approximate, unresolved: this.unresolved };
  }
}
