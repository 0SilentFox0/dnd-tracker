import { getP, put } from "@/lib/utils/battle/common/action-flow";
import { applyDamageConsequences } from "@/lib/utils/battle/damage/consequences";
import type { SpellCastState } from "@/lib/utils/battle/spell/cast/state";
import type { CastSpellParams } from "@/lib/utils/battle/types/spell-process";
import type { CastTestCtx, CastTestResult, RuleSystemMagic } from "@/lib/utils/rules/systems/types";
import type { SpellMagic } from "@/lib/utils/spells/model/schema";

interface Settle {
  magic: RuleSystemMagic;
  spellMagic: SpellMagic;
  cast: CastTestResult;
}

export function rollCastTest(magic: RuleSystemMagic, ctx: Omit<CastTestCtx, "presetRoll" | "system">, input: CastSpellParams["castTest"]): CastTestResult {
  const manual = !input?.serverRoll;

  return magic.castTest({ ...ctx, ...(manual && input?.roll !== undefined && { presetRoll: input.roll }), ...(input?.system && { system: input.system }) });
}

export function affectedIds(state: SpellCastState): string[] {
  return [...state.outcomes].filter(([, o]) => !o.skip).map(([id]) => id);
}

/** Lore attribute on the affected targets; only a successful cast reaches it. */
export function applyCastAttribute(state: SpellCastState, { magic, spellMagic }: Settle): void {
  const r = magic.attribute(state.flow.ps, affectedIds(state), spellMagic, state.flow.ctx.round);

  state.flow.ps = r.participants;
  state.flow.messages.push(...r.messages);
}

/** After the cost is paid: the system's spent resource is applied, channelled SL is gone, then the miscast (if any) lands on the caster. */
export function settleCastTest(state: SpellCastState, { magic, cast }: Settle): void {
  const casterId = state.caster.basicInfo.id;

  const caster = getP(state.flow, casterId);

  put(state.flow, { ...caster, battleData: { ...caster.battleData, ...(!cast.keepChannelled && { channelledSl: 0 }), ...cast.casterData } });

  if (!cast.miscast) return;

  const r = magic.miscast(state.flow.ps, casterId, cast.miscast, { round: state.flow.ctx.round, rng: state.rng, rules: state.flow.ctx.rules, applyDamage: applyDamageConsequences });

  state.flow.ps = r.participants;
  state.flow.messages.push(...r.messages);
  state.touchedIds.add(casterId);
}
