import type { SlotOption } from "./spell-flow-types";

import { poolLeft } from "@/lib/utils/abilities/engine/core/usage";
import type { BattleParticipant, SpellGrant } from "@/types/battle";
import type { BookSpell } from "@/types/spells";

export interface SourceOption {
  value: string;
  label: string;
  disabled: boolean;
}

export interface CastLevelOption {
  value: number;
  label: string;
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

export function poolUsage(caster: BattleParticipant, poolKey: string | undefined): { left: number; max: number; label: string } | undefined {
  const pool = poolKey ? caster.battleData.pools?.[poolKey] : undefined;

  if (!poolKey || !pool) return undefined;

  const left = poolLeft(caster, poolKey) ?? 0;

  return { left, max: pool.max, label: `${left}/${pool.max}${pool.recharge ? ` · ⟳ ${pool.recharge}–6` : " за відпочинок"}` };
}

export function grantLabel(caster: BattleParticipant | null, spellId: string): string | undefined {
  const grants = grantsFor(caster, spellId);

  if (grants.length === 0 || !caster) return undefined;

  return grants.map((grant) => `${grant.label ?? "Грант"}: ${grant.legendaryOnly ? "Лише легендарна / лігво · " : ""}${poolUsage(caster, grant.pool)?.label ?? "За бажанням"}`).join(" · ");
}

export function sourceOptions(caster: BattleParticipant | null, grants: SpellGrant[], slotChoices: Pick<SlotOption, "key" | "label">[]): SourceOption[] {
  if (grants.length === 0) return [];

  return [
    ...slotChoices.map((slot) => ({ value: `slot:${slot.key}`, label: `Слот ${slot.label}`, disabled: false })),
    ...grants.map((grant) => {
      const usage = caster ? poolUsage(caster, grant.pool) : undefined;

      return { value: `grant:${grant.key ?? grant.spellId}`, label: `${grant.label ?? "Безкоштовний каст"}${usage ? ` · ${usage.left}/${usage.max}` : " · без ліміту"}`, disabled: !!usage && usage.left < (grant.cost ?? 1) };
    }),
  ];
}

export function castLevelOptions(caster: BattleParticipant | null, grant: SpellGrant | undefined): CastLevelOption[] {
  const { upcast, castLevel: base } = grant ?? {};

  if (!grant || !upcast || base === undefined) return [];

  return Array.from({ length: upcast.maxLevel - base + 1 }, (_, i) => {
    const cost = (grant.cost ?? 1) + i * upcast.extraCost;

    const left = grant.pool && caster ? poolLeft(caster, grant.pool) ?? 0 : Infinity;

    return { value: base + i, label: `Коло ${base + i}${i ? ` · ${cost} заряди` : ""}`, disabled: left < cost };
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

export function inlineGrantLabel(caster: BattleParticipant | null, grant: SpellGrant | undefined): string | undefined {
  if (!grant) return undefined;

  const usage = caster ? poolUsage(caster, grant.pool) : undefined;

  return `${grant.label ?? "Підкаст"}: ${usage ? `${usage.left}/${usage.max}` : "без ліміту"}${grant.expiresRound !== undefined ? ` · до р. ${grant.expiresRound}` : ""}`;
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
      name: g.label ?? host?.name ?? "Підкаст",
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
