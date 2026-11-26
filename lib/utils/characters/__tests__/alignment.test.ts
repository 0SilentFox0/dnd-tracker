import { describe, expect, it } from 'vitest';

import { ALIGNMENTS } from '@/lib/constants/alignment';
import {
    ALIGNMENT_KEYS,
    alignmentKey,
    alignmentLabelKey,
} from '@/lib/utils/characters/alignment';

describe('alignment', () => {
    it('maps the nine canonical values in order', () => {
        ALIGNMENTS.forEach((name, i) =>
            expect(alignmentKey(name)).toBe(ALIGNMENT_KEYS[i])
        );
    });

    it('is case and space insensitive', () => {
        expect(alignmentKey('  chaotic   EVIL ')).toBe('chaoticEvil');
    });

    it('returns null for free text and empty values', () => {
        expect(alignmentKey('any alignment')).toBeNull();
        expect(alignmentKey('')).toBeNull();
        expect(alignmentKey(null)).toBeNull();
        expect(alignmentKey(undefined)).toBeNull();
    });

    it('builds the message key', () => {
        expect(alignmentLabelKey('Lawful Good', 'short')).toBe(
            'alignments.lawfulGood.short'
        );
        expect(alignmentLabelKey('whatever', 'name')).toBeNull();
    });
});
