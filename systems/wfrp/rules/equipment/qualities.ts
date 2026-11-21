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
    impenetrable: q(),
    partial: f(),
    weakpoints: f(),
} as const satisfies Record<string, Entry>;

export type QualityKey = keyof typeof QUALITY_REGISTRY;

/** Armour carries its qualities and flaws in one list (p306) */
export const ARMOUR_QUALITY_KEYS: readonly QualityKey[] = [
    'flexible',
    'practical',
    'impenetrable',
    'partial',
    'weakpoints',
];

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
    /** Inflict (Entangled) only: Strength the hold is broken against (p305) */
    strength?: number;
};

export const qualityValue = (
    list: readonly QualityRef[],
    key: QualityKey
): number | undefined => list.find((r) => r.key === key)?.value;

export const hasQuality = (
    list: readonly QualityRef[],
    key: QualityKey
): boolean => list.some((r) => r.key === key);
