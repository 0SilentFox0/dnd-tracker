import type { HitLocation } from '../combat/constants';
import type { WfrpConditionKey } from '../conditions/catalog';
import type { EditionProfile } from '../edition/profiles';
import {
    QUALITY_REGISTRY,
    type QualityKey,
    type QualityRef,
} from './qualities';

export type QualityEffect = {
    toHit: number;
    damage: number;
    damageSl?: number;
    apIgnored?: number;
    minDamage?: number;
    fumbleFrom?: number;
    /** Canon Blast: SL adds no damage */
    noSlDamage?: true;
    /** Canon Hack: AP worn off the struck location */
    armourWear?: number;
};

export type GearModel = EditionProfile['gearModel'];

export type QualityRoll = {
    attackRoll: number;
    netSl: number;
    crit: boolean;
    sb: number;
    ap: number;
};

type Refs = { qualities: QualityRef[]; flaws: QualityRef[] };

// All numbers: verify against 5e book
const TO_HIT: Partial<Record<QualityKey, number>> = {
    accurate: 10,
    imprecise: -10,
    slow: -10,
    fast: 5,
};

const FUMBLE_FROM: Partial<Record<QualityKey, number>> = {
    unreliable: 96,
    dangerous: 91,
};

const PUMMEL_DAMAGE = 2;

const PENETRATING_AP = 2;

const CANON_UNTYPED_TO_HIT: readonly QualityKey[] = [
    'imprecise',
    'fast',
    'accurate',
    'slow',
];

const active = (refs: Refs, gear: GearModel = 'legacy'): Set<QualityKey> => {
    const set = new Set(
        [...refs.qualities, ...refs.flaws]
            .map((r) => r.key)
            .filter((k) => QUALITY_REGISTRY[k].implemented)
    );

    if (gear === 'canon') {
        if (set.has('imprecise')) set.delete('precise');

        if (set.has('undamaging')) set.delete('damaging');

        if (set.has('unbalanced')) set.delete('defensive');
    }

    return set;
};

export function qualityToHit(p: Refs, gear: GearModel = 'legacy'): number {
    return [...active(p, gear)]
        .filter((k) => gear === 'legacy' || !CANON_UNTYPED_TO_HIT.includes(k))
        .reduce((sum, k) => sum + (TO_HIT[k] ?? 0), 0);
}

/** Canon Imprecise costs 1 SL on the attack, Precise adds 1 SL to a successful one, Practical to a failed one (p305) */
export function qualityAttackSl(
    p: Refs,
    gear: GearModel
): { penalty: number; onSuccess: number; onFail: number } {
    if (gear !== 'canon') return { penalty: 0, onSuccess: 0, onFail: 0 };

    const set = active(p, gear);

    return {
        penalty: set.has('imprecise') ? -1 : 0,
        onSuccess: set.has('precise') ? 1 : 0,
        onFail: set.has('practical') ? 1 : 0,
    };
}

/** Canon Impale: any roll divisible by 10 on a passed test is a critical hit (p304) */
export const qualityImpaleCrit = (
    p: Refs,
    roll: number,
    gear: GearModel
): boolean =>
    gear === 'canon' && active(p, gear).has('impale') && roll % 10 === 0;

/** Canon Dangerous: a failed test with a 9 on the tens or the units die is a fumble (p305) */
export const qualityDangerousFumble = (
    p: Refs,
    roll: number,
    gear: GearModel
): boolean =>
    gear === 'canon' &&
    active(p, gear).has('dangerous') &&
    (roll % 10 === 9 || Math.floor(roll / 10) === 9);

/** Canon Defensive gives +1 SL, Unbalanced -1 SL to a Melee Test that opposes an attack; Unbalanced wins over Defensive (p304-305) */
export function qualityDefence(
    p: Refs,
    gear: GearModel
): { bonus: number; penalty: number } {
    if (gear !== 'canon') return { bonus: 0, penalty: 0 };

    const set = active(p, gear);

    return {
        bonus: set.has('defensive') ? 1 : 0,
        penalty: set.has('unbalanced') ? -1 : 0,
    };
}

/** Canon Wrap: a Melee Test opposing this weapon suffers -1 SL (p305) */
export const qualityWraps = (p: Refs, gear: GearModel): boolean =>
    gear === 'canon' && active(p, gear).has('wrap');

/** Canon Parry: ignores the off-hand penalty when defending; the second dual-wield attack is unopposed after a hit (p304) */
export const qualityParry = (p: Refs, gear: GearModel): boolean =>
    gear === 'canon' && active(p, gear).has('parry');

/** Canon Fast adds 2 to Combat Initiative, never when fighting with two weapons (p304) */
export const qualityFast = (p: Refs, gear: GearModel): boolean =>
    gear === 'canon' && active(p, gear).has('fast');

/** Canon Trap Blade: a Critical defence may catch a blade instead (p306); Unbreakable weapons never snap */
export const qualityTrapBlade = (p: Refs, gear: GearModel): boolean =>
    gear === 'canon' && active(p, gear).has('trapBlade');

export const qualityUnbreakable = (p: Refs, gear: GearModel): boolean =>
    gear === 'canon' && active(p, gear).has('unbreakable');

export const qualityBlackpowder = (p: Refs, gear: GearModel): boolean =>
    gear === 'canon' && active(p, gear).has('blackpowder');

export function qualityInflicts(
    p: Refs,
    gear: GearModel,
    location?: HitLocation
): WfrpConditionKey[] {
    if (gear !== 'canon') return [];

    const set = active(p, gear);

    return [
        ...(set.has('entangle') ? (['entangled'] as const) : []),
        ...p.qualities.flatMap((r) => {
            const { condition } = r;

            return r.key === 'inflict' &&
                condition &&
                (!r.location || r.location === location)
                ? [condition]
                : [];
        }),
    ];
}

export const qualityStunsOnHead = (p: Refs, gear: GearModel): boolean =>
    gear === 'canon' && active(p, gear).has('pummel');

export function qualityFumbleFrom(
    p: Refs,
    gear: GearModel = 'legacy'
): number | undefined {
    const from = [...active(p, gear)]
        .filter((k) => gear === 'legacy' || k !== 'dangerous')
        .map((k) => FUMBLE_FROM[k])
        .filter((n): n is number => n !== undefined);

    return from.length ? Math.min(...from) : undefined;
}

export function qualityEffects(
    p: Refs,
    roll: QualityRoll,
    gear: GearModel = 'legacy'
): { effect: QualityEffect; steps: { key: string; value: number }[] } {
    const set = active(p, gear);

    const canon = gear === 'canon';

    const steps: { key: string; value: number }[] = [];

    const effect: QualityEffect = { toHit: qualityToHit(p, gear), damage: 0 };

    const add = (
        key: QualityKey,
        value: number,
        apply: (v: number) => void
    ) => {
        if (value === 0) return;

        apply(value);
        steps.push({ key, value });
    };

    if (canon && set.has('blast')) effect.noSlDamage = true;

    if (set.has('damaging')) {
        const units = roll.attackRoll % 10;

        add(
            'damaging',
            Math.max(0, units - (effect.noSlDamage ? 0 : roll.netSl)),
            (v) => (effect.damageSl = (effect.damageSl ?? 0) + v)
        );
    }

    if (!canon) {
        if (set.has('precise'))
            add(
                'precise',
                1,
                (v) => (effect.damageSl = (effect.damageSl ?? 0) + v)
            );

        if (set.has('impale') && roll.crit)
            add('impale', roll.sb, (v) => (effect.damage += v));

        if (set.has('pummel') && roll.crit)
            add('pummel', PUMMEL_DAMAGE, (v) => (effect.damage += v));
    }

    let ap = roll.ap;

    if (canon && set.has('hack') && ap > 0) {
        effect.armourWear = 1;
        add('hack', 1, (v) => (effect.apIgnored = (effect.apIgnored ?? 0) + v));
        ap -= 1;
    }

    if (set.has('penetrating')) {
        const ignored = canon
            ? Math.min(PENETRATING_AP, ap)
            : Math.floor(roll.ap / 2);

        ap -= canon ? ignored : 0;

        add(
            'penetrating',
            ignored,
            (v) => (effect.apIgnored = (effect.apIgnored ?? 0) + v)
        );
    }

    if (!canon && set.has('hack') && roll.crit)
        add(
            'hack',
            Math.min(1, roll.ap - (effect.apIgnored ?? 0)),
            (v) => (effect.apIgnored = (effect.apIgnored ?? 0) + v)
        );

    if (set.has('undamaging')) {
        effect.minDamage = 0;

        if (canon) add('undamaging', -ap, () => {});
    }

    const fumbleFrom = qualityFumbleFrom(p, gear);

    if (fumbleFrom !== undefined) effect.fumbleFrom = fumbleFrom;

    return { effect, steps };
}
