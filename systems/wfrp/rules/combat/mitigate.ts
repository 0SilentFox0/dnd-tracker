import { value } from '../characteristics/derive';
import { applyWfrpConditionTo } from '../conditions/apply';
import type { WfrpConditionKey } from '../conditions/catalog';
import { editionOf } from '../edition';
import { hasQuality, QUALITY_REGISTRY } from '../equipment/qualities';
import {
    qualityEffects,
    qualityInflicts,
    qualityStunsOnHead,
} from '../equipment/quality-effects';
import { ATTACK_SLOT } from '../slots';
import { breathDamage } from '../traits/breath';
import { BREATH_CONDITION } from '../traits/constants';
import { FRENZY_DAMAGE_BONUS, isFrenzied } from '../traits/frenzy';
import { withFireWounds } from '../traits/regeneration';
import { sizeDamageBonus, sizeMeleeDamage, wardRoll } from '../traits/size';
import { helplessKillsOf, isHelpless } from './attack-mods/helpless';
import { applyWfrpCrit } from './crit-effect';
import { type CritResult, rollCrit } from './crit-table';
import { computeWfrpDamage } from './damage';
import { asLocation, sideOf } from './location';
import { chargeSb } from './mounted';
import {
    apAt,
    markedApAt,
    nonMetalApAt,
    participantChars,
    participantStats,
    withArmourWear,
} from './participant';
import { pointBlankBetween } from './range-band';
import { canonWeaponUse } from './weapon-use';
import { isBrokenWeapon, wornWeaponDamage } from './weapon-wear';

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

/** Impenetrable (p306): a Critical Hit rolled on 11, 33, 55, 77 or 99 is ignored */
const isOddDouble = (roll: number | undefined): boolean =>
    roll !== undefined &&
    roll > 0 &&
    roll < 100 &&
    roll % 11 === 0 &&
    (roll / 11) % 2 === 1;

/** Partial (p306): an even Hit Location number (the reversed roll) ignores the piece's AP */
const partialIgnored = (roll: number | undefined): boolean =>
    roll !== undefined &&
    (roll % 100 === 0 ? 0 : (roll % 10) * 10 + Math.floor(roll / 10)) % 2 === 0;

const critRank = (c: CritResult) =>
    c.death ? Infinity : Number(c.id.split('.')[1]);

const totalLabel = textRef('battleWfrp.damage.total');

export function mitigateWfrpDamage(ctx: MitigateCtx): MitigateResult {
    const { attacker, target } = ctx;

    const location = asLocation(ctx.location);

    const edition = editionOf(ctx.rules);

    const slain =
        edition.gearModel === 'canon' &&
        helplessKillsOf(ctx.rules) &&
        isHelpless(target) &&
        target.combatStats.currentHp > 0 &&
        (attackKindOf(ctx.attack.type) === AttackType.MELEE ||
            pointBlankBetween(attacker, target, ctx.rules));

    if (ctx.amount <= 0 && !slain) return { amount: 0, steps: [], totalLabel };

    if (edition.gearModel === 'canon' && isBrokenWeapon(attacker, ctx.attack))
        return { amount: 0, steps: [], totalLabel };

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

    const ownSb = participantStats(attacker)?.sb ?? 0;

    const sb =
        edition.actionsModel === 'canon' ? chargeSb(attacker, ownSb) : ownSb;

    const slot = ATTACK_SLOT.read(ctx.attack.system);

    const breath = edition.traitModel === 'canon' ? slot?.breath : undefined;

    if (breath === 'smoke') return { amount: 0, steps: [], totalLabel };

    const gear = edition.gearModel;

    const refs =
        gear === 'canon'
            ? canonWeaponUse(attacker, ctx.attack).refs
            : { qualities: slot?.qualities ?? [], flaws: slot?.flaws ?? [] };

    const stats = participantStats(target);

    const ignoredAp =
        gear === 'canon'
            ? Math.max(
                  ctx.crit && hasQuality(refs.qualities, 'impale')
                      ? markedApAt(stats, 'weakpoints', location)
                      : 0,
                  partialIgnored(ctx.attackRoll)
                      ? markedApAt(stats, 'partial', location)
                      : 0
              )
            : 0;

    const ap = Math.max(
        0,
        (breath === 'electricity'
            ? nonMetalApAt(stats, location)
            : apAt(stats, location)) - ignoredAp
    );

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
        edition.sizeModel === 'canon'
            ? sizeMeleeDamage(attacker, ctx.attack, sb, ctx.offTurn)
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
        weapon: breath
            ? breathDamage(breath, {
                  sb: participantStats(attacker)?.sb ?? 0,
                  tb: participantStats(attacker)?.tb ?? 0,
              })
            : gear === 'canon'
              ? wornWeaponDamage(ctx.weapon, attacker, ctx.attack)
              : ctx.weapon,
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

    if (slain && base.total < target.combatStats.currentHp) {
        steps.push(
            step('helplessKill', target.combatStats.currentHp - base.total)
        );

        base.total = target.combatStats.currentHp;
    }

    const impenetrable =
        gear === 'canon' &&
        isOddDouble(ctx.attackRoll) &&
        markedApAt(stats, 'impenetrable', location) > 0;

    const crit =
        ctx.crit &&
        !impenetrable &&
        (counted || target.combatStats.currentHp > 0)
            ? effect.minDamage === 0 && gear === 'canon'
                ? lower(rollOnce(), rollOnce())
                : rollOnce()
            : undefined;

    if (crit?.bonusDamage) steps.push(step('crit', crit.bonusDamage));

    const hit = base.total > 0;

    const breathCondition =
        breath && hit && breath in BREATH_CONDITION
            ? [BREATH_CONDITION[breath as keyof typeof BREATH_CONDITION]]
            : [];

    const conditions: { key: WfrpConditionKey; strength?: number }[] = [
        ...breathCondition.map((key) => ({ key })),
        ...qualityInflicts(
            refs,
            gear,
            location,
            value(participantChars(attacker), 's')
        ),
        ...(location === 'head' &&
        qualityStunsOnHead(refs, gear) &&
        base.total >= (participantStats(target)?.tb ?? 0)
            ? [{ key: 'stunned' as const }]
            : []),
    ];

    const wear = (effect.armourWear ?? 0) + (breath === 'acid' && hit ? 1 : 0);

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

            for (const { key, strength } of conditions) {
                const applied = applyWfrpConditionTo(participant, {
                    key,
                    ...(strength !== undefined && { strength }),
                    round,
                    edition,
                    sourceName: attacker.basicInfo.name,
                });

                participant = applied.participant;

                message = applied.messages[0] ?? message;
            }

            if (breath === 'fire' && hit)
                participant = withFireWounds(
                    participant,
                    base.total + (crit?.bonusDamage ?? 0)
                );

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
