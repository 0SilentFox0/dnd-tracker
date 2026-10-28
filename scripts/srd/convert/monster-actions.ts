import type { Fixture, O5Creature, O5CreatureAction, Open5eData } from "../lib/open5e";
import { bySlug, clamp } from "../lib/text";
import type { SpellRow } from "../lib/types";
import { MONSTER_ACTIONS_GROUP } from "./spell-groups";

import type { AbilityKey } from "@/lib/constants/abilities";
import type { Effect } from "@/lib/utils/abilities/schema";
import type { SpellTargeting } from "@/lib/utils/spells/model/schema";
import type { UnitSpellcasting } from "@/types/units";

type Grant = UnitSpellcasting["spells"][number];

const SAVE = /\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw: DC (\d+),?\s*/i;

const DAMAGE = /^\s*(?:\d+\s*)?\((\d+)d(4|6|8|10|12)(?:\s*([+−-])\s*(\d+))?\)\s+(\w+) damage/i;

const CONDITION = /\b(?:has|have|gains?|is subjected to) the ([^.]+?) conditions?\b/i;

const CONDITIONS = /\b(Blinded|Charmed|Deafened|Frightened|Grappled|Incapacitated|Invisible|Paralyzed|Petrified|Poisoned|Prone|Restrained|Stunned|Unconscious)\b/gi;

const AREA = /\b(\d+)-foot(?:-radius|-long)?(?:,? (\d+)-foot-(?:wide|high|tall))?\s+(Cone|Line|Sphere|Cylinder|Emanation)\b/i;

function targeting(text: string): SpellTargeting {
  const area = AREA.exec(text);

  const range = Number(/\bwithin (\d+) feet/i.exec(text)?.[1] ?? 5);

  if (area) {
    const kind = area[3].toLowerCase();

    const shape = kind === "sphere" || kind === "cylinder" ? "circle" : kind as "cone" | "line" | "emanation";

    return { kind: "template", shape, size: clamp(Number(area[1]), 5, 120), side: "enemy", maxTargets: 20, ...(shape === "circle" && { exact: true, range: clamp(range, 5, 600) }) };
  }

  return /\beach creature\b/i.test(text)
    ? { kind: "area", side: "enemy", maxTargets: 20, range: clamp(range, 5, 600) }
    : { kind: "enemy", range: clamp(range, 5, 600) };
}

export function actionGrant(action: O5CreatureAction, spellId: string): Grant {
  const uses = action.uses_type;

  const roll = action.uses_param ?? 6;

  const daily = /\((\d+)\/Day\)/i.exec(action.name);

  return {
    spellId,
    ...(uses === "PER_DAY" || daily ? { perBattle: clamp(action.uses_param ?? Number(daily?.[1] ?? 1), 1, 9) } : {}),
    ...(uses === "RECHARGE" || uses === "RECHARGE_ON_ROLL" ? { perBattle: 1 } : {}),
    ...(uses === "RECHARGE_ON_ROLL" && (roll === 4 || roll === 5 || roll === 6) && { recharge: roll }),
    ...(action.action_type === "LEGENDARY_ACTION" && { legendaryOnly: true }),
  };
}

/** Unsupported actions remain source-text notes in the unit converter. */
export function saveAction(action: Fixture<O5CreatureAction>, creature: Fixture<O5Creature>): { spell: SpellRow; grant: Grant } | null {
  const f = action.fields;

  const text = f.desc.replace(/\*\*/g, "").trim();

  const save = SAVE.exec(text);

  if (!save || /Attack Roll:/.test(text) || [...text.matchAll(/Saving Throw: DC/gi)].length > 1) return null;

  const failure = text.split(/\bFailure(?: or Success)?:/i)[1]?.split(/\bSuccess:/i)[0];

  if (!failure) return null;

  const damage = DAMAGE.exec(failure.replace(/^\s*(?:The target|Each target) takes /i, ""));

  const conditions = [...(CONDITION.exec(failure)?.[1].matchAll(CONDITIONS) ?? [])].map((m) => m[1].toLowerCase());

  const exhaustion = /gains? (\d+) Exhaustion levels?/i.exec(failure);

  if (!damage && conditions.length === 0 && !exhaustion) return null;

  if (damage && Number(damage[1]) > 40) return null;

  const ability = save[1].toLowerCase() as AbilityKey;

  const effects: Effect[] = [];

  const bonus = damage?.[4] ? Number(damage[4]) * (damage[3] === "+" ? 1 : -1) : 0;

  if (bonus < -20 || bonus > 40) return null;

  if (damage) effects.push({ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: damage[5].toLowerCase() });

  for (const condition of [...conditions, ...(exhaustion ? ["exhaustion"] : [])]) {
    const minutes = /for (\d+) minutes?/i.exec(failure);

    const rounds = /for (\d+) rounds?/i.exec(failure);

    const duration = minutes ? Number(minutes[1]) * 10 : rounds ? Number(rounds[1]) : /until the (?:end|start) of/.test(failure) ? 1 : 99;

    effects.push({ kind: "applyCondition", condition: condition as Extract<Effect, { kind: "applyCondition" }>["condition"], ...(condition === "exhaustion" && { levels: Number(exhaustion?.[1] ?? 1) }), duration: { rounds: clamp(duration, 1, 99) }, ...(/repeats? the sav(?:e|ing throw)/i.test(failure) && { saveEnds: { ability } }) });
  }

  const name = `${f.name} (${creature.fields.name})`;

  return {
    spell: {
      slug: action.pk, name, groupId: MONSTER_ACTIONS_GROUP, description: f.desc, level: 0, cost: f.action_type === "BONUS_ACTION" ? "bonusAction" : "action",
      dice: damage ? Number(damage[1]) : 0, ...(damage && { dieSides: Number(damage[2]) as SpellRow["dieSides"] }), ...(bonus !== 0 && { damageBonus: bonus }), fixedDice: true,
      concentration: /\bConcentration\b/.test(text), targeting: targeting(text), resolution: { kind: "save", ability, onSuccess: /Success: Half damage|half as much/i.test(text) ? "half" : "none" }, spellEffects: effects, lists: [],
    },
    grant: { ...actionGrant(f, name), dc: Number(save[2]) },
  };
}

export function convertMonsterActions(data: Open5eData): SpellRow[] {
  const creatures = new Map(data.creatures.map((c) => [c.pk, c]));

  return data.creatureActions.flatMap((a) => {
    const creature = creatures.get(a.fields.parent);

    const result = creature ? saveAction(a, creature) : null;

    return result ? [result.spell] : [];
  }).sort(bySlug);
}

const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function spellsInText(text: string, names: readonly string[]): Grant[] {
  const clean = text.replace(/\*/g, "");

  const dc = /spell save DC (\d+)/i.exec(clean)?.[1];

  const attack = /([+−-]\d+) to hit with spell attacks/i.exec(clean)?.[1];

  return names.flatMap((name) => {
    const match = new RegExp(`\\b${escaped(name)}\\b(?:\\s*\\(level (\\d+) version\\))?`, "i").exec(clean);

    return match ? [{ spellId: name, ...(match[1] && { castLevel: clamp(Number(match[1]), 1, 9) }), ...(dc && { dc: Number(dc) }), ...(attack && { attackBonus: Number(attack.replace("−", "-")) }) }] : [];
  });
}

export function spellcastingBlock(text: string, names: readonly string[]): UnitSpellcasting {
  const clean = text.replace(/\*/g, "");

  const ability = /using (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) as (?:its |the )?spellcasting ability/i.exec(clean)?.[1].toLowerCase() as AbilityKey | undefined;

  const dc = /spell save DC (\d+)/i.exec(clean)?.[1];

  const attack = /([+−-]\d+) to hit with spell attacks/i.exec(clean)?.[1];

  const spells = [...clean.matchAll(/\b(At Will|([1-9])\/Day(?: Each)?):\s*([\s\S]*?)(?=\b(?:At Will|[1-9]\/Day(?: Each)?):|$)/gi)].flatMap((heading) => spellsInText(heading[3], names).map((grant) => ({ ...grant, ...(heading[2] && { perBattle: Number(heading[2]) }) })));

  return { ...(ability && { ability }), ...(dc && { dc: Number(dc) }), ...(attack && { attackBonus: Number(attack.replace("−", "-")) }), spells };
}
