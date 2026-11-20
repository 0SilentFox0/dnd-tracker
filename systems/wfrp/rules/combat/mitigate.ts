import { applyWfrpConditionTo } from '../conditions/apply';
import type { WfrpConditionKey } from '../conditions/catalog';
import { editionOf } from '../edition';
import { QUALITY_REGISTRY } from '../equipment/qualities';
import {
    qualityEffects,
    qualityInflicts,
    qualityStunsOnHead,
} from '../equipment/quality-effects';
import { ACTION_SLOT, ATTACK_SLOT } from '../slots';
import { FRENZY_DAMAGE_BONUS, isFrenzied } from '../traits/frenzy';
import { canonSizeDamage, sizeDamageBonus, wardRoll } from '../traits/size';
import { applyWfrpCrit } from './crit-effect';
import { type CritResult, rollCrit } from './crit-table';
import { computeWfrpDamage } from './damage';
import { asLocation, sideOf } from './location';
import { apAt, participantStats, withArmourWear } from './participant';
import { canonWeaponUse } from './weapon-use';

import { AttackType } from '@/lib/constants/battle';
import { dynamicTextRef, textRef } from '@/lib/i18n/text-ref';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import type {
    DamageCtx,
    DamageResult,
    MitigateCtx,
    MitigateResult,
    MitigateStep,
} from '@/lib/utils/rules/systems/types';
import type { LogLine } from '@/types/text';

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

const critRank = (c: CritResult) =>
    c.death ? Infinity : Number(c.id.split('.')[1]);

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

    const ap = apAt(participantStats(target), location);

    const slot = ATTACK_SLOT.read(ctx.attack.system);

    const edition = editionOf(ctx.rules);

    const gear = edition.gearModel;

    const refs =
        gear === 'canon'
            ? canonWeaponUse(attacker, ctx.attack).refs
            : { qualities: slot?.qualities ?? [], flaws: slot?.flaws ?? [] };

    const { effect, steps: qualitySteps } = qualityEffects(
        refs,
        {
            attackRoll: ctx.attackRoll ?? 0,
            netSl: ctx.margin,
            crit: ctx.crit,
            sb,
            ap,
        },
        gear
    );

    const margin = effect.noSlDamage ? 0 : ctx.margin;

    const appliedSb = slot?.noSb ? 0 : sb;

    const size =
        edition.combatModsModel === 'canon5e'
            ? canonSizeDamage(attacker, sb, {
                  ranged: attackKindOf(ctx.attack.type) === AttackType.RANGED,
                  free: ACTION_SLOT.read(ctx.system)?.attack?.free === true,
                  baked: slot?.sizeBaked === true,
              })
            : sizeDamageBonus(
                  attacker,
                  target,
                  ctx.weapon + appliedSb + margin
              );

    const frenzyBonus =
        isFrenzied(attacker) &&
        attackKindOf(ctx.attack.type) === AttackType.MELEE
            ? FRENZY_DAMAGE_BONUS
            : 0;

    const base = computeWfrpDamage({
        weapon: ctx.weapon,
        sb: appliedSb,
        netSl: margin,
        size,
        tb: participantStats(target)?.tb ?? 0,
        ap,
        extra: [
            ...qualitySteps,
            ...(frenzyBonus ? [{ key: 'frenzy', value: frenzyBonus }] : []),
        ],
        minDamage: effect.minDamage,
    });

    const steps = base.steps
        .filter((s) => s.key === 'weapon' || s.value !== 0)
        .map((s) => step(s.key, s.value));

    const raw = base.steps.reduce((sum, s) => sum + s.value, 0);

    if (base.total !== raw) steps.push(step('minimum', base.total - raw));

    const counted = edition.woundModel === 'critical';

    const rollOnce = () =>
        rollCrit(
            location,
            ctx.rules,
            ctx.rng,
            undefined,
            0,
            sideOf(ctx.location),
            participantStats(target)?.tb ?? 0
        );

    const lower = (a: CritResult, b: CritResult) =>
        critRank(b) < critRank(a) ? b : a;

    const crit =
        ctx.crit && (counted || target.combatStats.currentHp > 0)
            ? effect.minDamage === 0 && gear === 'canon'
                ? lower(rollOnce(), rollOnce())
                : rollOnce()
            : undefined;

    if (crit?.bonusDamage) steps.push(step('crit', crit.bonusDamage));

    const conditions: WfrpConditionKey[] = [
        ...qualityInflicts(refs, gear, location),
        ...(location === 'head' &&
        qualityStunsOnHead(refs, gear) &&
        base.total >= (participantStats(target)?.tb ?? 0)
            ? (['stunned'] as const)
            : []),
    ];

    const wear = effect.armourWear ?? 0;

    if (!crit && !conditions.length && !wear)
        return { amount: base.total, steps, totalLabel };

    return {
        amount: base.total + (crit?.bonusDamage ?? 0),
        steps,
        totalLabel,
        afterHit: (p, round) => {
            let participant = wear ? withArmourWear(p, location, wear) : p;

            let message: LogLine | undefined = wear
                ? textRef('battleWfrp.log.armourWorn', {
                      target: p.basicInfo.name,
                      amount: wear,
                  })
                : undefined;

            for (const key of conditions) {
                const applied = applyWfrpConditionTo(participant, {
                    key,
                    round,
                    edition,
                    sourceName: attacker.basicInfo.name,
                });

                participant = applied.participant;

                message = applied.messages[0] ?? message;
            }

            if (crit) {
                const applied = applyWfrpCrit(
                    participant,
                    crit,
                    round,
                    edition
                );

                participant = applied.participant;

                message = applied.message;
            }

            return { participant, message: message ?? '' };
        },
    };
}

export const wfrpDamage = (ctx: DamageCtx): DamageResult => ({
    doubleDice: false,
    mitigated:
        ctx.hit &&
        mitigateWfrpDamage({ ...ctx.hit, rules: ctx.rules, crit: ctx.crit }),
});
