import { ALIGNMENTS } from '@/lib/constants/alignment';

export const ALIGNMENT_KEYS = [
    'lawfulGood',
    'neutralGood',
    'chaoticGood',
    'lawfulNeutral',
    'trueNeutral',
    'chaoticNeutral',
    'lawfulEvil',
    'neutralEvil',
    'chaoticEvil',
] as const;

export type AlignmentKey = (typeof ALIGNMENT_KEYS)[number];

export function alignmentKeyOf(
    value: string | null | undefined
): AlignmentKey | null {
    const index = ALIGNMENTS.findIndex((a) => a === value?.trim());

    return ALIGNMENT_KEYS[index] ?? null;
}

export function alignmentLabel(
    value: string | null | undefined,
    t: (key: string) => string,
    form: 'name' | 'short' = 'name'
): string {
    if (!value) return '';

    const key = alignmentKeyOf(value);

    return key ? t(`alignments.${key}.${form}`) : value;
}
