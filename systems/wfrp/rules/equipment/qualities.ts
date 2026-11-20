import type { HitLocation } from '../combat/constants';
import type { WfrpConditionKey } from '../conditions/catalog';

type Entry = {
    kind: 'quality' | 'flaw';
    hasValue: boolean;
    implemented: boolean;
    /** `false`: absent from the canon book, hidden from the editor and ignored by the engine */
    canon?: false;
};

const q = (hasValue = false, implemented = true, canon?: false): Entry => ({
    kind: 'quality',
    hasValue,
    implemented,
    ...(canon === false && { canon }),
});

const f = (hasValue = false, implemented = true): Entry => ({
    kind: 'flaw',
    hasValue,
    implemented,
});

// verify against 5e book
export const QUALITY_REGISTRY = {
    damaging: q(),
    impale: q(),
    penetrating: q(),
    hack: q(),
    pummel: q(),
    precise: q(),
    accurate: q(),
    blast: q(true),
    pistol: q(),
    blackpowder: q(),
    shield: q(true),
    defensive: q(),
    parry: q(),
    fast: q(),
    flexible: q(),
    distract: q(true, false, false),
    entangle: q(true),
    wrap: q(),
    spread: q(false, false, false),
    trapBlade: q(),
    unbreakable: q(),
    inflict: q(true),
    repeater: q(true),
    imprecise: f(),
    undamaging: f(),
    unreliable: f(),
    dangerous: f(),
    slow: f(),
    unbalanced: f(),
    reload: f(true),
    bulky: f(),
    lightweight: q(),
    practical: q(),
} as const satisfies Record<string, Entry>;

export type QualityKey = keyof typeof QUALITY_REGISTRY;

export const QUALITY_KEYS = Object.keys(QUALITY_REGISTRY) as [
    QualityKey,
    ...QualityKey[],
];

export type QualityRef = {
    key: QualityKey;
    value?: number;
    /** Inflict (Condition) only */
    condition?: WfrpConditionKey;
    /** Inflict only: the condition lands only on a hit to this location (Bolas: legs) */
    location?: HitLocation;
};

export const qualityValue = (
    list: readonly QualityRef[],
    key: QualityKey
): number | undefined => list.find((r) => r.key === key)?.value;

export const hasQuality = (
    list: readonly QualityRef[],
    key: QualityKey
): boolean => list.some((r) => r.key === key);
