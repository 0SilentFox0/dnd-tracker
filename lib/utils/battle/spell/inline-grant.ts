import { findParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { isZoneConcentrationLive } from "@/lib/utils/battle/concentration";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { BattleParticipant, SpellGrant } from "@/types/battle";

export function isGrantLive(grant: SpellGrant, round: number, ps: BattleParticipant[]): boolean {
  return (grant.expiresRound === undefined || round <= grant.expiresRound) && isZoneConcentrationLive(ps, grant.concentrationOf);
}

export const peekInlineGrant = (ps: BattleParticipant[], casterId: string, data: { spellId: string; grantKey?: string }): SpellGrant | undefined =>
  data.grantKey ? findParticipant(ps, casterId)?.spellcasting.grants?.find((g) => g.key === data.grantKey && g.spellId === data.spellId && g.inline) : undefined;

/** Підкаст кастується як окреме заклинання 0-го кола з визначенням з гранту. */
export function withInlineDefinition(spell: CastableSpell, grant: SpellGrant): CastableSpell {
  const { inline } = grant;

  if (!inline) return spell;

  const { targeting, resolution, dice, dieSides, addAbilityMod, damageBonus, perObjectFeet, effects } = inline;

  return {
    ...spell,
    name: grant.label ?? spell.name,
    level: 0,
    definition: { executionMode: "native", dice, cost: grant.castCost ?? "action", targeting, resolution, effects, raceModifiers: [], fixedDice: true, ...(dieSides && { dieSides }), ...(addAbilityMod && { addAbilityMod }), ...(damageBonus !== undefined && { damageBonus }), ...(perObjectFeet && { perObjectFeet }) },
  };
}

export function pruneDeadInlineGrants(p: BattleParticipant, round: number, ps: BattleParticipant[]): BattleParticipant {
  const grants = p.spellcasting.grants ?? [];

  const dead = grants.filter((g) => g.inline && !isGrantLive(g, round, ps));

  if (dead.length === 0) return p;

  const pools = Object.fromEntries(Object.entries(p.battleData.pools ?? {}).filter(([key]) => !dead.some((g) => g.pool === key)));

  const usage = Object.fromEntries(Object.entries(p.battleData.abilityUsage ?? {}).filter(([key]) => !dead.some((g) => g.pool === key)));

  return { ...p, spellcasting: { ...p.spellcasting, grants: grants.filter((g) => !dead.includes(g)) }, battleData: { ...p.battleData, pools, abilityUsage: usage } };
}
