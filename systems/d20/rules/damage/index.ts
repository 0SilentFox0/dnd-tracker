import type { DamageCtx, DamageResult } from '@/lib/utils/rules/systems/types';

export const d20Damage = (ctx: DamageCtx): DamageResult => ({
    doubleDice: ctx.crit && !!ctx.rules.criticals.doubleDice,
});
