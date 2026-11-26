import { ALIGNMENTS } from '@/lib/constants/alignment';

export type AlignmentKey =
    | 'lawfulGood'
    | 'neutralGood'
    | 'chaoticGood'
    | 'lawfulNeutral'
    | 'trueNeutral'
    | 'chaoticNeutral'
    | 'lawfulEvil'
    | 'neutralEvil'
    | 'chaoticEvil';

export const ALIGNMENT_KEYS: readonly AlignmentKey[] = [
    'lawfulGood',
    'neutralGood',
    'chaoticGood',
    'lawfulNeutral',
    'trueNeutral',
    'chaoticNeutral',
    'lawfulEvil',
    'neutralEvil',
    'chaoticEvil',
];

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

const BY_NAME = new Map(
    ALIGNMENTS.map((name, i) => [normalize(name), ALIGNMENT_KEYS[i]])
);

export function alignmentKey(
    value: string | null | undefined
): AlignmentKey | null {
    return value ? (BY_NAME.get(normalize(value)) ?? null) : null;
}

export function alignmentLabelKey(
    value: string,
    form: 'name' | 'short'
): string | null {
    const key = alignmentKey(value);

    return key ? `alignments.${key}.${form}` : null;
}
