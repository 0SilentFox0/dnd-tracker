import { API_ERRORS } from "@/lib/constants/api-errors";
import { cooldownLeft, poolLeft, withinCountLimits } from "@/lib/utils/abilities/engine/core/usage";
import { lairAbilities, lairBlocker } from "@/lib/utils/battle/actions/lair";
import { legendaryAbilities, legendaryBlocker, legendaryCostOf } from "@/lib/utils/battle/actions/legendary-options";
import { currentOf } from "@/lib/utils/battle/common/control";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError } from "@/lib/utils/battle/store";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { BattleParticipant } from "@/types/battle";

export type SpellSourceRequest = { spellId: string; legendaryKey?: string; free?: boolean; slotKey?: string; grantKey?: string; castLevel?: number };

export function resolveSpellSource(ctx: BattleMutationContext, caster: BattleParticipant, spell: CastableSpell, data: SpellSourceRequest) {
  const legendaryAbility = data.legendaryKey ? [...legendaryAbilities(caster), ...lairAbilities(caster)].find((a) => a.key === data.legendaryKey && a.perform?.kind === "spell" && a.perform.spellId === data.spellId) : undefined;

  if (data.legendaryKey) {
    if (!legendaryAbility) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_NO_SUCH_LEGENDARY_SPELL);

    const blocker = legendaryAbility.limits?.lair ? lairBlocker(caster, ctx.scene.round, legendaryAbility.key) : legendaryBlocker(caster, currentOf(ctx), legendaryCostOf(legendaryAbility));

    if (blocker) throw new BattleRuleError("action_rejected", blocker);

    if (!withinCountLimits(caster, legendaryAbility)) throw new BattleRuleError("ability_limit", API_ERRORS.BATTLE_USES_EXHAUSTED);

    const wait = cooldownLeft(caster, legendaryAbility, ctx.scene.round);

    if (wait > 0) throw new BattleRuleError("ability_limit", API_ERRORS.ABILITY_COOLDOWN, { rounds: wait });
  }

  // вільний каст DM (швидкі дії): будь-яке закляття без слота; хід героя під керуванням DM — за правилами героя

  const free = ctx.isDM && data.free === true;

  const spellGrants = free ? [] : (caster.spellcasting.grants ?? []).filter((g) => g.spellId === data.spellId);

  let grant = data.grantKey ? spellGrants.find((g) => g.key === data.grantKey) : undefined;

  if (data.grantKey && !grant) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_SPELL_SOURCE_UNAVAILABLE);

  if (!data.grantKey && data.slotKey) {
    if (!caster.spellcasting.slotSpells?.includes(data.spellId) && !spellGrants.some((g) => g.via === "slotOrGrant") && spellGrants.length > 0) throw new BattleRuleError("action_rejected", API_ERRORS.GRANT_NO_SLOT);
  } else if (!data.grantKey && spellGrants.length > 1) {
    throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_SPELL_SOURCE_REQUIRED);
  } else if (!data.grantKey && spellGrants.length === 1) {
    grant = spellGrants[0];
  }

  if (data.grantKey && data.slotKey) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_SPELL_SLOT_OR_SOURCE);

  if (grant && data.castLevel !== undefined && (!grant.upcast || data.castLevel < (grant.castLevel ?? 0) || data.castLevel > grant.upcast.maxLevel)) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_ITEM_UPCAST_LEVEL_INVALID);

  if (data.castLevel !== undefined && grant?.upcast) grant = { ...grant, cost: (grant.cost ?? 1) + (data.castLevel - (grant.castLevel ?? 0)) * grant.upcast.extraCost };

  if (!free && !legendaryAbility && !grant && !caster.spellcasting.knownSpells.includes(data.spellId)) {
    throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_CASTER_UNKNOWN_SPELL);
  }

  if (grant && data.slotKey) throw new BattleRuleError("action_rejected", API_ERRORS.GRANT_NO_SLOT);

  if (grant?.legendaryOnly && !legendaryAbility) throw new BattleRuleError("action_rejected", API_ERRORS.SPELL_LEGENDARY_ONLY);

  if (grant?.pool && (poolLeft(caster, grant.pool) ?? -1) < (grant.cost ?? 1)) {
    throw new BattleRuleError("action_rejected", API_ERRORS.SPELL_USES_EMPTY);
  }

  if (grant?.castLevel !== undefined && grant.castLevel < spell.level) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_SOURCE_LEVEL_TOO_LOW);

  return { legendaryAbility, free, grant };
}
