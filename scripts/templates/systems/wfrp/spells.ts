import { descriptionIssues, type Row } from "./common";
import { unitTraits } from "./units";

import { isRecord } from "@/lib/utils/common/is-record";
import type { SpellMagicKind } from "@/lib/utils/spells/model/schema";
import { WFRP_CONDITION_KEYS } from "@/systems/wfrp/constants/conditions";
import { NO_OVERCAST_KINDS, PRAYER_KINDS } from "@/systems/wfrp/rules/magic/constants";

export const GRIM_SPELL_KINDS = ["petty", "arcane", "hedge", "witchcraft", "blessing", "miracle"] as const satisfies readonly SpellMagicKind[];

export type GrimSpellKind = (typeof GRIM_SPELL_KINDS)[number];

export const GRIM_SPELL_LISTS: Record<GrimSpellKind, readonly string[]> = {
  petty: ["Cantrips"],
  arcane: ["School of Embers", "School of Gloam"],
  hedge: ["Fenlore"],
  witchcraft: ["Thornwitchery"],
  blessing: ["Hearth Rites"],
  miracle: ["Hearth Rites"],
};

export const SPELL_CN_BANDS: Record<GrimSpellKind, readonly [number, number]> = { petty: [0, 2], arcane: [3, 12], hedge: [3, 12], witchcraft: [3, 12], blessing: [0, 0], miracle: [6, 14] };

export const SPELL_KEYS: readonly string[] = ["slug", "name", "level", "cost", "description", "casting", "targeting", "dice", "upcastDice", "spellEffects", "ingredients", "componentFlags", "lists"];

export const INGREDIENT_PENCE = [6, 240] as const;

const PENCE_PER_GP = 240;

const INGREDIENT_KINDS: readonly string[] = ["arcane", "hedge", "witchcraft"];

export const FORBIDDEN_CONDITIONS: readonly string[] = ["unconscious", "surprised"];

const TARGETING_KINDS: readonly string[] = ["ally", "enemy", "area", "template"];

const isGrimKind = (kind: unknown): kind is GrimSpellKind => (GRIM_SPELL_KINDS as readonly unknown[]).includes(kind);

export function spellMagicOf(row: Row): { cn: number; kind: string } | null {
  const casting = row.casting;

  const magic = isRecord(casting) ? casting.magic : undefined;

  return isRecord(magic) && typeof magic.cn === "number" && typeof magic.kind === "string" ? { cn: magic.cn, kind: magic.kind } : null;
}

const SPELL_ROLL = { spellRoll: 100 };

function effectIssues(effects: unknown[], issues: string[]): string | null {
  if (effects.length > 1) issues.push("a spell may have at most one effect");

  let kind: string | null = null;

  for (const e of effects) {
    const k = isRecord(e) ? e.kind : undefined;

    if (k !== "dealDamage" && k !== "heal") {
      issues.push(`effect "${String(k)}" is not allowed (dealDamage or heal only)`);

      continue;
    }

    kind ??= k;

    if (JSON.stringify((e as Record<string, unknown>).amount) !== JSON.stringify(SPELL_ROLL)) issues.push(`${k} amount must be { spellRoll: 100 }`);

    if (k === "dealDamage" && (e as Record<string, unknown>).damageType !== "magic") issues.push('dealDamage needs damageType "magic"');
  }

  return kind;
}

function targetingIssues(targeting: unknown, effect: string | null, hasAttribute: boolean, issues: string[]) {
  if (!isRecord(targeting)) return void issues.push("targeting is required");

  const { kind, side, shape } = targeting;

  if (typeof kind !== "string" || !TARGETING_KINDS.includes(kind)) return void issues.push(`targeting "${String(kind)}" is not used by Grim spells`);

  if (kind === "template" && shape !== "circle") issues.push('template targeting must be a "circle"');

  const heals = effect === "heal";

  if (heals && hasAttribute) issues.push("a heal spell cannot carry an attribute");

  const allied = kind === "ally" || ((kind === "area" || kind === "template") && side === "ally");

  const hostile = kind === "enemy" || ((kind === "area" || kind === "template") && side === "enemy");

  if (heals && !allied) issues.push(`targeting "${kind}"${typeof side === "string" ? ` (${side})` : ""} does not fit a heal spell`);

  if (!heals && !hostile) issues.push(`targeting "${kind}"${typeof side === "string" ? ` (${side})` : ""} does not fit a harmful spell`);
}

function ingredientIssues(row: Row, kind: string | undefined, issues: string[]) {
  const list = row.ingredients;

  const has = Array.isArray(list) && list.length > 0;

  if (has && kind && !INGREDIENT_KINDS.includes(kind)) issues.push(`ingredients are not allowed for ${kind}`);

  if (has && list.length > 1) issues.push("a spell may have at most one ingredient");

  if (has) {
    const [first] = list as unknown[];

    const i = isRecord(first) ? first : {};

    if (i.qty !== 1 || i.consumed !== true || i.focus !== false) issues.push("ingredient must have qty 1, consumed true, focus false");

    const pence = typeof i.minGp === "number" ? Number((i.minGp * PENCE_PER_GP).toFixed(6)) : NaN;

    if (!Number.isInteger(pence) || pence < INGREDIENT_PENCE[0] || pence > INGREDIENT_PENCE[1]) issues.push(`ingredient price ${typeof i.minGp === "number" ? pence : String(i.minGp)} p is outside ${INGREDIENT_PENCE[0]}–${INGREDIENT_PENCE[1]} p (whole pence)`);
  }

  const flags = row.componentFlags;

  const exact = isRecord(flags) && Object.keys(flags).length === 3 && flags.v === true && flags.s === true && flags.m === true;

  if (has !== (flags !== undefined) || (has && !exact)) issues.push("componentFlags must be { v, s, m: true } exactly when there is an ingredient");
}

/** Grim-specific checks of one spells.json row; the resource schema is checked by validateRows. */
export function spellIssues(row: Row): string[] {
  const issues: string[] = [];

  for (const key of Object.keys(row)) if (!SPELL_KEYS.includes(key)) issues.push(`column "${key}" is not used by Grim spells`);

  const casting = row.casting;

  const magic = isRecord(casting) && isRecord(casting.magic) ? casting.magic : null;

  if (!magic) issues.push("casting.magic is required");
  else if (Object.keys(casting as object).length > 1) issues.push("casting may hold only magic");

  const kind = magic && isGrimKind(magic.kind) ? magic.kind : undefined;

  if (magic && !kind) issues.push(`kind "${String(magic.kind)}" is not used by Grim spells`);

  if (magic && kind) {
    const [min, max] = SPELL_CN_BANDS[kind];

    if (!Number.isInteger(magic.cn) || (magic.cn as number) < min || (magic.cn as number) > max) issues.push(`CN ${String(magic.cn)} is outside ${min}–${max} for ${kind}`);

    if (magic.overcast === "targets") issues.push('overcast "targets" is not supported by the engine');
    else if (magic.overcast !== null && magic.overcast !== "dice") issues.push(`overcast ${JSON.stringify(magic.overcast)} is not allowed for ${kind}`);
    else if (magic.overcast === "dice" && NO_OVERCAST_KINDS.has(kind)) issues.push(`overcast "dice" is not allowed for ${kind}`);
  }

  if (row.cost !== "action") issues.push('cost must be "action"');

  if (row.level !== 1) issues.push("level must be 1");

  const lists = Array.isArray(row.lists) ? row.lists : [];

  if (kind) {
    const allowed = GRIM_SPELL_LISTS[kind];

    if (lists.length !== 1 || !allowed.includes(String(lists[0]))) issues.push(`lists must be one of: ${allowed.join(", ")}`);
  }

  const effects = Array.isArray(row.spellEffects) ? row.spellEffects : [];

  const effect = effectIssues(effects, issues);

  const dice = typeof row.dice === "number" ? row.dice : 0;

  if ((effects.length > 0) !== dice >= 1) issues.push("dice must be ≥ 1 exactly when the spell has an effect");

  const attribute = magic && isRecord(magic.attribute) ? magic.attribute : null;

  if (effects.length === 0 && !attribute) issues.push("spell has neither an effect nor an attribute");

  if (attribute) {
    const condition = String(attribute.condition);

    if (!(WFRP_CONDITION_KEYS as readonly string[]).includes(condition)) issues.push(`attribute condition "${condition}" is not a wfrp condition`);
    else if (FORBIDDEN_CONDITIONS.includes(condition)) issues.push(`attribute condition "${condition}" is not allowed`);
  }

  if (row.targeting !== undefined || effects.length > 0 || attribute) targetingIssues(row.targeting, effect, !!attribute, issues);

  const upcast = row.upcastDice;

  if (magic?.overcast === "dice") {
    if (upcast !== 1 || dice < 1) issues.push('overcast "dice" needs upcastDice 1 and dice ≥ 1');
  } else if (upcast !== undefined) issues.push('upcastDice needs overcast "dice"');

  ingredientIssues(row, kind, issues);

  issues.push(...descriptionIssues(row));

  return issues;
}

export function castCeiling(unit: Row, kind: string): number {
  const base = isRecord(unit.characteristics) && isRecord(unit.characteristics.base) ? unit.characteristics.base : {};

  const stat = (key: string) => (typeof base[key] === "number" ? (base[key] as number) : 0);

  const sl = PRAYER_KINDS.has(kind as SpellMagicKind) ? Math.floor(stat("fel") / 10) : Math.floor(stat("int") / 10) - unitTraits(unit).ap;

  return Math.max(0, sl);
}

export function unitSpellIssues(unit: Row, spells: Map<string, Row>): string[] {
  const known = Array.isArray(unit.knownSpells) ? unit.knownSpells.map(String) : [];

  return known.flatMap((name) => {
    const row = spells.get(name);

    const magic = row ? spellMagicOf(row) : null;

    if (!magic) return [];

    const cn = magic.kind === "blessing" ? 0 : magic.cn;

    const ceiling = castCeiling(unit, magic.kind);

    return cn > ceiling ? [`knownSpells "${name}" CN ${cn} is above the best SL ${ceiling} this unit can reach`] : [];
  });
}
