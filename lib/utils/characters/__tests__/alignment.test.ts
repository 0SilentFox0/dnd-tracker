import { describe, expect, it } from 'vitest';

import { ALIGNMENTS } from '@/lib/constants/alignment';
import {
    ALIGNMENT_KEYS,
    alignmentKeyOf,
    alignmentLabel,
} from '@/lib/utils/characters/alignment';

const t = (key: string) => `t:${key}`;

describe('alignment', () => {
    it('maps every canonical value to a key, in order', () => {
        expect(ALIGNMENT_KEYS).toHaveLength(ALIGNMENTS.length);
        ALIGNMENTS.forEach((value, i) =>
            expect(alignmentKeyOf(value)).toBe(ALIGNMENT_KEYS[i])
        );
        expect(alignmentKeyOf('True Neutral')).toBe('trueNeutral');
    });

    it('translates a canonical value', () => {
        expect(alignmentLabel('Lawful Good', t)).toBe(
            't:alignments.lawfulGood.name'
        );
        expect(alignmentLabel('Chaotic Evil', t, 'short')).toBe(
            't:alignments.chaoticEvil.short'
        );
    });

    it('falls back to the raw free value', () => {
        expect(alignmentLabel('any alignment', t)).toBe('any alignment');
        expect(alignmentKeyOf('any alignment')).toBeNull();
    });

    it('returns an empty string for null and empty', () => {
        expect(alignmentLabel(null, t)).toBe('');
        expect(alignmentLabel(undefined, t)).toBe('');
        expect(alignmentLabel('', t)).toBe('');
    });
});
