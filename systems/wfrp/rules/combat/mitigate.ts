import { QUALITY_REGISTRY } from '../equipment/qualities';
import { qualityEffects } from '../equipment/quality-effects';
import { ATTACK_SLOT } from '../slots';
import { sizeDamageBonus, wardRoll } from '../traits/size';
import { applyWfrpCrit } from './crit-effect';
import { rollCrit } from './crit-table';
import { computeWfrpDamage } from './damage';
import { asLocation } from './location';
import { participantStats } from './participant';

import { dynamicTextRef, textRef } from '@/lib/i18n/text-ref';
import type {
    DamageCtx,
    DamageResult,
    MitigateCtx,
    MitigateResult,
    MitigateStep,
} from '@/lib/utils/rules/systems/types';

const step = (key: string, value: number): MitigateStep => ({
    key,
    value,
    label: dynamicTextRef(
        key in QUALITY_REGISTRY
            ? `wfrpEquipment.qualities.${key}`
            : `battleWfrp.damage.steps.${key}`
    ),
    side: key === 'tb' || key === 'ap' ? 'target' : 'attacker',
});

const totalLabel = textRef('battleWfrp.damage.total');

export function mitigateWfrpDamage(ctx: MitigateCtx): MitigateResult {
    const { attacker, target } = ctx;

    const location = asLocation(ctx.location);

    if (ctx.amount <= 0) return { amount: 0, steps: [], totalLabel };

    const ward = wardRoll(target, ctx.rng);

    if (ward?.saved) {
        return {
            amount: 0,
            steps: [
                {
                    key: 'ward',
                    value: 0,
                    label: textRef('battleWfrp.damage.steps.ward', {
                        roll: ward.roll,
                        ward: participantStats(target)?.ward ?? 0,
                    }),
                    side: 'target',
                },
            ],
            totalLabel,
        };
    }

    const sb = participantStats(attacker)?.sb ?? 0;

    const ap = participantStats(target)?.ap[location] ?? 0;

    const slot = ATTACK_SLOT.read(ctx.attack.system);

    const { effect, steps: qualitySteps } = qualityEffects(
        { qualities: slot?.qualities ?? [], flaws: slot?.flaws ?? [] },
        {
            attackRoll: ctx.attackRoll ?? 0,
            netSl: ctx.margin,
            crit: ctx.crit,
            sb,
            ap,
        }
    );

    const appliedSb = slot?.noSb ? 0 : sb;

    const size = sizeDamageBonus(
        attacker,
        target,
        ctx.weapon + appliedSb + ctx.margin
    );

    const base = computeWfrpDamage({
        weapon: ctx.weapon,
        sb: appliedSb,
        netSl: ctx.margin,
        size,
        tb: participantStats(target)?.tb ?? 0,
        ap,
        extra: qualitySteps,
        minDamage: effect.minDamage,
    });

    const steps = base.steps
        .filter((s) => s.key === 'weapon' || s.value !== 0)
        .map((s) => step(s.key, s.value));

    const raw = base.steps.reduce((sum, s) => sum + s.value, 0);

    if (base.total !== raw) steps.push(step('minimum', base.total - raw));

    const crit =
        ctx.crit && target.combatStats.currentHp > 0
            ? rollCrit(location, ctx.rules, ctx.rng)
            : undefined;

    if (!crit) return { amount: base.total, steps, totalLabel };

    if (crit.bonusDamage > 0) steps.push(step('crit', crit.bonusDamage));

    return {
        amount: base.total + crit.bonusDamage,
        steps,
        totalLabel,
        afterHit: (p, round) => applyWfrpCrit(p, crit, round),
    };
}

export const wfrpDamage = (ctx: DamageCtx): DamageResult => ({
    doubleDice: false,
    mitigated:
        ctx.hit &&
        mitigateWfrpDamage({ ...ctx.hit, rules: ctx.rules, crit: ctx.crit }),
});
