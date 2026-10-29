import type { SlotOption } from "./spell-flow-types";

import { joinLines, textRef } from "@/lib/i18n/text-ref";
import { poolLeft } from "@/lib/utils/abilities/engine/core/usage";
import type { BattleParticipant, SpellGrant } from "@/types/battle";
import type { BookSpell } from "@/types/spells";
import type { LogLine } from "@/types/text";

export interface SourceOption {
  value: string;
  label: LogLine;
  disabled: boolean;
}

export interface CastLevelOption {
  value: number;
  label: LogLine;
  disabled: boolean;
}

export const grantsFor = (caster: BattleParticipant | null, spellId: string): SpellGrant[] => (caster?.spellcasting.grants ?? []).filter((g) => g.spellId === spellId && !g.inline);

export const canCastFromSlot = (caster: BattleParticipant | null, spellId: string): boolean => {
  const grants = grantsFor(caster, spellId);

  return !!caster?.spellcasting.slotSpells?.includes(spellId) || grants.length === 0 || grants.some((g) => g.via === "slotOrGrant");
};

/** Обраний грант: за ключем, а без обраного ключа — єдиний грант закляття. */
export function selectedGrantOf(grants: SpellGrant[], pick: { slotKey?: string; grantKey?: string }): SpellGrant | undefined {
  if (pick.slotKey) return undefined;

  return grants.find((g) => g.key && g.key === pick.grantKey) ?? (pick.grantKey ? undefined : grants.length === 1 ? grants[0] : undefined);
}

/** Грант, що підставляється при виборі закляття: єдиний, якщо слот не конкурує з ним. */
export function defaultGrant(grants: SpellGrant[], opts: { hasSlotChoices: boolean; spellLevel: number }): SpellGrant | undefined {
  const grant = grants.length === 1 ? grants[0] : undefined;

  return grant && (!opts.hasSlotChoices || grant.via !== "slotOrGrant" || opts.spellLevel === 0) ? grant : undefined;
}

export function poolUsage(caster: BattleParticipant, poolKey: string | undefined): { left: number; max: number; label: LogLine } | undefined {
  const pool = poolKey ? caster.battleData.pools?.[poolKey] : undefined;

  if (!poolKey || !pool) return undefined;

  const left = poolLeft(caster, poolKey) ?? 0;

  return { left, max: pool.max, label: pool.recharge ? textRef("battleWizards.flow.pool.recharge", { left, max: pool.max, recharge: pool.recharge }) : textRef("battleWizards.flow.pool.rest", { left, max: pool.max }) };
}

export function grantLabel(caster: BattleParticipant | null, spellId: string): LogLine | undefined {
  const grants = grantsFor(caster, spellId);

  if (grants.length === 0 || !caster) return undefined;

  return joinLines(
    grants.map((grant) => textRef(grant.legendaryOnly ? "battleWizards.flow.grant.lineLegendary" : "battleWizards.flow.grant.line", {
      label: grant.label ?? textRef("battleWizards.flow.grant.defaultLabel"),
      usage: poolUsage(caster, grant.pool)?.label ?? textRef("battleWizards.flow.grant.optional"),
    })),
    " · ",
  );
}

function itemLabel(grant: SpellGrant, usage: { left: number; max: number } | undefined): LogLine {
  const label = grant.label ?? textRef("battleWizards.flow.grant.freeCast");

  return usage ? textRef("battleWizards.flow.grant.withUsage", { label, left: usage.left, max: usage.max }) : textRef("battleWizards.flow.grant.unlimited", { label });
}

export function sourceOptions(caster: BattleParticipant | null, grants: SpellGrant[], slotChoices: Pick<SlotOption, "key" | "label">[]): SourceOption[] {
  if (grants.length === 0) return [];

  return [
    ...slotChoices.map((slot) => ({ value: `slot:${slot.key}`, label: textRef("battleWizards.flow.grant.slotOption", { slot: slot.label }), disabled: false })),
    ...grants.map((grant) => {
      const usage = caster ? poolUsage(caster, grant.pool) : undefined;

      return { value: `grant:${grant.key ?? grant.spellId}`, label: itemLabel(grant, usage), disabled: !!usage && usage.left < (grant.cost ?? 1) };
    }),
  ];
}

export function castLevelOptions(caster: BattleParticipant | null, grant: SpellGrant | undefined): CastLevelOption[] {
  const { upcast, castLevel: base } = grant ?? {};

  if (!grant || !upcast || base === undefined) return [];

  return Array.from({ length: upcast.maxLevel - base + 1 }, (_, i) => {
    const cost = (grant.cost ?? 1) + i * upcast.extraCost;

    const left = grant.pool && caster ? poolLeft(caster, grant.pool) ?? 0 : Infinity;

    return { value: base + i, label: i ? textRef("battleWizards.flow.grant.castLevelCost", { level: base + i, cost }) : textRef("battleWizards.flow.grant.castLevel", { level: base + i }), disabled: left < cost };
  });
}

export interface CostBlockInput {
  caster: BattleParticipant | null;
  spell: { cost?: string };
  definitionCost: string;
  grants: SpellGrant[];
  grant: SpellGrant | undefined;
  slotKey?: string;
  free: boolean;
  bypassCost: boolean;
  special: boolean;
  isDM: boolean;
  isMyTurn: boolean;
  reactionBlocked: boolean;
}

export function costBlocked(i: CostBlockInput): boolean {
  const { caster, grant } = i;

  if (!caster || i.free) return false;

  if (!i.isDM && i.spell.cost !== "reaction" && !i.isMyTurn) return true;

  if (i.spell.cost === "reaction" && i.reactionBlocked) return true;

  if (i.grants.length > 0 && !grant && !i.slotKey) return true;

  if (grant?.legendaryOnly && !i.special) return true;

  if (grant?.pool && (poolLeft(caster, grant.pool) ?? 0) < (grant.cost ?? 1)) return true;

  if (i.bypassCost) return false;

  return i.definitionCost === "reaction" ? caster.actionFlags.hasUsedReaction : i.definitionCost === "bonusAction" ? caster.actionFlags.hasUsedBonusAction : caster.actionFlags.hasUsedAction;
}

export const inlineGrantOf = (caster: BattleParticipant | null, s: BookSpell): SpellGrant | undefined => (s.grantKey ? caster?.spellcasting.grants?.find((g) => g.key === s.grantKey) : undefined);

export function inlineGrantLabel(caster: BattleParticipant | null, grant: SpellGrant | undefined): LogLine | undefined {
  if (!grant) return undefined;

  const usage = caster ? poolUsage(caster, grant.pool) : undefined;

  return textRef("battleWizards.flow.grant.inline", {
    label: grant.label ?? textRef("battleWizards.flow.grant.inlineDefault"),
    usage: usage ? `${usage.left}/${usage.max}` : textRef("battleWizards.flow.grant.noLimit"),
    expires: grant.expiresRound !== undefined ? textRef("battleWizards.flow.grant.until", { round: grant.expiresRound }) : "",
  });
}

/** Живі inline-гранти носія як плитки книги: власне визначення замість бібліотечного заклинання. */
export function inlineSpellTiles(caster: BattleParticipant | null, library: BookSpell[], live: (g: SpellGrant) => boolean): BookSpell[] {
  return (caster?.spellcasting.grants ?? []).flatMap((g) => {
    const { inline } = g;

    const host = library.find((s) => s.id === g.spellId);

    if (!inline || !g.key || !live(g)) return [];

    return [{
      id: g.key,
      hostSpellId: g.spellId,
      grantKey: g.key,
      name: g.label ?? host?.name ?? g.key,
      level: 0,
      icon: host?.icon,
      spellGroup: host?.spellGroup,
      fx: host?.fx,
      description: host?.description,
      executionMode: "native",
      dice: inline.dice,
      cost: g.castCost ?? "action",
      targeting: inline.targeting,
      resolution: inline.resolution,
      spellEffects: inline.effects,
      raceModifiers: [],
      fixedDice: true,
      ...(inline.dieSides && { dieSides: inline.dieSides }),
      ...(inline.addAbilityMod && { addAbilityMod: true }),
      ...(inline.damageBonus !== undefined && { damageBonus: inline.damageBonus }),
      ...(inline.perObjectFeet && { perObjectFeet: inline.perObjectFeet }),
    } as BookSpell];
  });
}
