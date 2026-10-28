import { coreAbility, noteAbility, uniqueId } from "../lib/abilities";
import { type Fixture, type O5Creature, type O5CreatureAction, type O5CreatureAttack, type Open5eData, slugTail } from "../lib/open5e";
import { bySlug, clamp, numberWord, titleCase } from "../lib/text";
import type { UnitAttackRow, UnitRow } from "../lib/types";
import { UNIT_OVERRIDES } from "../overrides/units";

import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { proficiencyForChallenge } from "@/lib/constants/challenge";
import type { WeaponTrait } from "@/lib/constants/weapon-traits";
import type { Ability, Effect } from "@/lib/utils/abilities/schema";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import { groupBy } from "@/lib/utils/common/collections";

const SIZE_CELLS: Record<string, UnitRow["gridSize"]> = { tiny: 1, small: 1, medium: 1, large: 2, huge: 3, gargantuan: 3 };

const TEXT_ATTACK = /^(Melee or Ranged|Melee|Ranged) Attack Roll: \+(\d+)(?: to hit)?(?: \([^)]*\))?, (?:reach (\d+) (?:ft\.|feet))?(?: or )?(?:range (\d+)(?:\/(\d+))? (?:ft\.|feet))?\.? (?:\d+ \((\d+)d(\d+)(?: ([+−-]) (\d+))?\)|(\d+)) (\w+) damage([\s\S]*)$/;

const TEXT_EXTRA = /^,? plus \d+ \((\d+d\d+)\) (\w+) damage/i;

const MULTI_COUNT = /\b(one|two|three|four|five|six|seven|eight|nine|ten)\s(?:[^.,]*?\s)?attacks?\b/gi;

const MULTI_ALT = /,?\s+or (?:it|he|she|the \w+) makes\b/i;

const LEGENDARY_RES = /^Legendary Resistance \((\d+)\/Day/i;

const REGEN = /regains (\d+) Hit Points at the start of (?:each of )?its turns?/i;

const score = (c: O5Creature, k: AbilityKey) => c[`ability_score_${k}`];

const dieOf = (count: number | null, type: string | null) => (count && type ? `${count}d${type.replace(/^D/i, "")}` : null);

export function multiattackCount(desc: string): number {
  const first = (desc.split(/\.\s/)[0] ?? "").split(MULTI_ALT)[0];

  const total = [...first.matchAll(MULTI_COUNT)].reduce((sum, m) => sum + (numberWord(m[1]) ?? 0), 0);

  return clamp(total, 1, 10);
}

// the engine rolls attackBonus + ability mod + proficiency (from CR) and adds the ability mod to damage; the rows store only the residual
function engineMod(c: O5Creature, type: UnitAttackRow["type"], finesse: boolean): number {
  const str = getAbilityModifier(clamp(score(c, "strength"), 1, 30));

  const dex = getAbilityModifier(clamp(score(c, "dexterity"), 1, 30));

  if (finesse) return dex > str ? dex : str;

  return type === "ranged" ? dex : str;
}

const withFlat = (dice: string, flat: number) => (flat === 0 ? dice : `${dice}${flat > 0 ? "+" : ""}${flat}`);

function withTraits(row: UnitAttackRow, traits: WeaponTrait[]): UnitAttackRow {
  return traits.length > 0 ? { ...row, traits } : row;
}

function attackFromRecord(action: Fixture<O5CreatureAction>, a: O5CreatureAttack, c: O5Creature): UnitAttackRow {
  const melee = (a.reach ?? 0) > 0;

  const ranged = (a.range ?? 0) > 0;

  const str = getAbilityModifier(score(c, "strength"));

  const dex = getAbilityModifier(score(c, "dexterity"));

  const finesse = melee && a.damage_bonus === dex && dex !== str;

  const traits: WeaponTrait[] = [...(melee && (a.reach ?? 0) >= 10 ? (["reach"] as const) : []), ...(melee && ranged ? (["thrown"] as const) : []), ...(finesse ? (["finesse"] as const) : [])];

  const extra = dieOf(a.extra_damage_die_count, a.extra_damage_die_type);

  const notes = [extra && `plus ${extra} ${(a.extra_damage_type ?? "").toLowerCase()} damage`].filter(Boolean);

  const type = melee ? "melee" : "ranged";

  const mod = engineMod(c, type, finesse);

  const dice = dieOf(a.damage_die_count, a.damage_die_type);

  const row: UnitAttackRow = {
    name: action.fields.name,
    type,
    attackBonus: a.to_hit_mod - mod - proficiencyForChallenge(Number(c.challenge_rating)),
    damageDice: dice ? withFlat(dice, (a.damage_bonus ?? 0) - mod) : String(Math.max(1, a.damage_bonus ?? 1)),
    damageType: (a.damage_type ?? "bludgeoning").toLowerCase(),
    ...(ranged && { range: a.long_range ? `${a.range}/${a.long_range}` : `${a.range}` }),
    ...(notes.length > 0 && { properties: notes.join("; ") }),
  };

  return withTraits(row, traits);
}

export function parseTextAttack(name: string, desc: string, c?: O5Creature): UnitAttackRow | null {
  const m = TEXT_ATTACK.exec(desc.trim());

  if (!m) return null;

  const [, kind, bonus, reach, range, long, count, sides, sign, bonusDamage, flat, type, rest] = m;

  const extra = TEXT_EXTRA.exec(rest ?? "");

  const attackType = kind.startsWith("Melee") ? "melee" : "ranged";

  const statDamage = bonusDamage ? (sign === "+" ? 1 : -1) * Number(bonusDamage) : 0;

  const dexOnly = !!c && attackType === "melee" && statDamage === getAbilityModifier(clamp(score(c, "dexterity"), 1, 30)) && statDamage !== getAbilityModifier(clamp(score(c, "strength"), 1, 30));

  const mod = c ? engineMod(c, attackType, dexOnly) : 0;

  const traits: WeaponTrait[] = [...(reach && Number(reach) >= 10 ? (["reach"] as const) : []), ...(kind === "Melee or Ranged" ? (["thrown"] as const) : []), ...(dexOnly ? (["finesse"] as const) : [])];

  const row: UnitAttackRow = {
    name,
    type: attackType,
    attackBonus: c ? Number(bonus) - mod - proficiencyForChallenge(Number(c.challenge_rating)) : Number(bonus),
    damageDice: count ? withFlat(`${count}d${sides}`, c ? statDamage - mod : 0) : flat,
    damageType: type.toLowerCase(),
    ...(range && { range: long ? `${range}/${long}` : range }),
    ...(extra && { properties: `plus ${extra[1]} ${extra[2].toLowerCase()} damage` }),
  };

  return withTraits(row, traits);
}

function usesSuffix(a: O5CreatureAction): string {
  if (a.uses_type === "RECHARGE_ON_ROLL") return ` (Recharge ${a.uses_param ?? 6}–6)`;

  if (a.uses_type === "PER_DAY") return ` (${a.uses_param ?? 1}/Day)`;

  if (a.uses_type === "RECHARGE") return " (Recharge after a Rest)";

  if (a.action_type === "BONUS_ACTION") return " (Bonus Action)";

  if (a.action_type === "REACTION") return " (Reaction)";

  return "";
}

const flagsAbility = (id: string, name: string, list: string[], effect: (t: string) => Effect): Ability | null =>
  list.length > 0 ? coreAbility(id, name, list.map(titleCase).join(", "), { trigger: { event: "passive" }, effects: list.map(effect) }) : null;

function statblock(c: O5Creature): string {
  const speeds = [c.walk && `${c.walk} ft.`, c.climb && `climb ${c.climb} ft.`, c.fly && `fly ${c.fly} ft.`, c.swim && `swim ${c.swim} ft.`, c.burrow && `burrow ${c.burrow} ft.`].filter(Boolean);

  const senses = [
    c.blindsight_range && `Blindsight ${c.blindsight_range} ft.`,
    c.darkvision_range && `Darkvision ${c.darkvision_range} ft.`,
    c.tremorsense_range && `Tremorsense ${c.tremorsense_range} ft.`,
    c.truesight_range && `Truesight ${c.truesight_range} ft.`,
    c.passive_perception !== null && `Passive Perception ${c.passive_perception}`,
  ].filter(Boolean);

  return [`${titleCase(c.size)} ${titleCase(c.type)}, ${titleCase(c.alignment)}`, `Speed: ${speeds.join(", ") || "—"}`, `Senses: ${senses.join(", ") || "—"}`, `Languages: ${c.languages_desc || "—"}`].join("\n");
}

export function convertUnits(data: Open5eData): UnitRow[] {
  const actions = groupBy(data.creatureActions, (a) => a.fields.parent);

  const attacks = groupBy(data.creatureAttacks, (a) => a.fields.parent);

  const traits = groupBy(data.creatureTraits, (t) => t.fields.parent);

  return data.creatures
    .map((row): UnitRow => {
      const c = row.fields;

      const seen = new Set<string>();

      const cr = Number(c.challenge_rating);

      const own = [...(actions.get(row.pk) ?? [])].sort((a, b) => (a.fields.order_in_statblock ?? 0) - (b.fields.order_in_statblock ?? 0));

      const unitAttacks: UnitAttackRow[] = [];

      const abilities: Ability[] = [noteAbility(uniqueId(seen, "statblock"), "Statblock", statblock(c))];

      let legendaryResistances = 0;

      for (const t of traits.get(row.pk) ?? []) {
        const res = LEGENDARY_RES.exec(t.fields.name);

        if (res) {
          legendaryResistances = Number(res[1]);
          continue;
        }

        const id = uniqueId(seen, slugTail(t.pk));

        const regen = REGEN.exec(t.fields.desc);

        if (t.fields.name.startsWith("Magic Resistance")) abilities.push(coreAbility(id, t.fields.name, t.fields.desc, { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "saveAdvantage", abilities: "all", vsSpells: true }] }));
        else if (t.fields.name.startsWith("Regeneration") && regen) abilities.push(coreAbility(id, t.fields.name, t.fields.desc, { trigger: { event: "turnStart" }, effects: [{ kind: "heal", amount: Number(regen[1]), target: "self" }] }));
        else abilities.push(noteAbility(id, t.fields.name, t.fields.desc));
      }

      const immunities = [
        flagsAbility(uniqueId(seen, "damage-immunities"), "Damage Immunities", c.damage_immunities, (t) => ({ kind: "flag", flag: "resistance", damageType: t, percent: 100 })),
        flagsAbility(uniqueId(seen, "damage-resistances"), "Damage Resistances", c.damage_resistances, (t) => ({ kind: "flag", flag: "resistance", damageType: t, percent: 50 })),
        flagsAbility(uniqueId(seen, "damage-vulnerabilities"), "Damage Vulnerabilities", c.damage_vulnerabilities, (t) => ({ kind: "flag", flag: "resistance", damageType: t, percent: -100 })),
      ];

      if (c.condition_immunities.length > 0) {
        abilities.push(
          coreAbility(uniqueId(seen, "condition-immunities"), "Condition Immunities", c.condition_immunities.map(titleCase).join(", "), {
            trigger: { event: "passive" },
            // SRD condition names match CONDITION_5E_KEYS 1:1 (checked by the integrity test)
            effects: [{ kind: "flag", flag: "conditionImmunity", conditions: c.condition_immunities as never }],
          }),
        );
      }

      abilities.push(...immunities.filter((a): a is Ability => a !== null));

      let multiattack = 1;

      let legendary = false;

      for (const a of own) {
        const f = a.fields;

        if (f.name === "Multiattack") {
          multiattack = multiattackCount(f.desc);
          continue;
        }

        if (f.action_type === "LEGENDARY_ACTION") {
          legendary = true;
          abilities.push(coreAbility(uniqueId(seen, slugTail(a.pk)), f.name, f.desc, { trigger: { event: "action" }, limits: { legendaryCost: clamp(f.legendary_action_cost ?? 1, 1, 3) }, effects: [{ kind: "note", text: f.name }] }));
          continue;
        }

        const records = attacks.get(a.pk) ?? [];

        if (records.length > 0) {
          unitAttacks.push(...records.map((r) => attackFromRecord(a, r.fields, c)));
          continue;
        }

        const parsed = f.action_type === "ACTION" && !f.uses_type ? parseTextAttack(f.name, f.desc, c) : null;

        if (parsed) {
          unitAttacks.push(parsed);
          continue;
        }

        const name = `${f.name}${usesSuffix(f)}`;

        abilities.push(noteAbility(uniqueId(seen, slugTail(a.pk)), name, f.desc));
      }

      return {
        slug: row.pk,
        name: c.name,
        level: clamp(Math.ceil(cr), 1, 30),
        cr,
        armorClass: c.armor_class,
        maxHp: c.hit_points,
        speed: c.walk ?? c.fly ?? c.swim ?? 30,
        initiative: c.initiative_bonus,
        strength: clamp(c.ability_score_strength, 1, 30),
        dexterity: clamp(c.ability_score_dexterity, 1, 30),
        constitution: clamp(c.ability_score_constitution, 1, 30),
        intelligence: clamp(c.ability_score_intelligence, 1, 30),
        wisdom: clamp(c.ability_score_wisdom, 1, 30),
        charisma: clamp(c.ability_score_charisma, 1, 30),
        gridSize: SIZE_CELLS[c.size] ?? 1,
        multiattack,
        legendaryActions: legendary ? 3 : 0,
        legendaryResistances,
        saveProficiencies: ABILITY_KEYS.filter((k) => {
          const total = c[`saving_throw_${k}`];

          return typeof total === "number" && total > getAbilityModifier(score(c, k));
        }),
        attacks: unitAttacks,
        abilities,
        ...UNIT_OVERRIDES[row.pk],
      };
    })
    .sort(bySlug);
}
