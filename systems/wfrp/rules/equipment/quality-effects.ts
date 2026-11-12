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
};

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

const active = (refs: Refs): Set<QualityKey> =>
    new Set(
        [...refs.qualities, ...refs.flaws]
            .map((r) => r.key)
            .filter((k) => QUALITY_REGISTRY[k].implemented)
    );

export function qualityToHit(p: Refs): number {
    return [...active(p)].reduce((sum, k) => sum + (TO_HIT[k] ?? 0), 0);
}

export function qualityFumbleFrom(p: Refs): number | undefined {
    const from = [...active(p)]
        .map((k) => FUMBLE_FROM[k])
        .filter((n): n is number => n !== undefined);

    return from.length ? Math.min(...from) : undefined;
}

export function qualityEffects(
    p: Refs,
    roll: QualityRoll
): { effect: QualityEffect; steps: { key: string; value: number }[] } {
    const set = active(p);

    const steps: { key: string; value: number }[] = [];

    const effect: QualityEffect = { toHit: qualityToHit(p), damage: 0 };

    const add = (
        key: QualityKey,
        value: number,
        apply: (v: number) => void
    ) => {
        if (value === 0) return;

        apply(value);
        steps.push({ key, value });
    };

    if (set.has('damaging'))
        add(
            'damaging',
            Math.max(0, (roll.attackRoll % 10) - roll.netSl),
            (v) => (effect.damageSl = (effect.damageSl ?? 0) + v)
        );

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

    if (set.has('penetrating'))
        add(
            'penetrating',
            Math.floor(roll.ap / 2),
            (v) => (effect.apIgnored = (effect.apIgnored ?? 0) + v)
        );

    if (set.has('hack') && roll.crit)
        add(
            'hack',
            Math.min(1, roll.ap - (effect.apIgnored ?? 0)),
            (v) => (effect.apIgnored = (effect.apIgnored ?? 0) + v)
        );

    if (set.has('undamaging')) effect.minDamage = 0;

    const fumbleFrom = qualityFumbleFrom(p);

    if (fumbleFrom !== undefined) effect.fumbleFrom = fumbleFrom;

    return { effect, steps };
}
