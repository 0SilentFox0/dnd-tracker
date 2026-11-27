import { describe, expect, it } from 'vitest';

import { alignmentLabelKey } from '../alignment';

describe('alignmentLabelKey', () => {
    it('maps the raw "unaligned" value to its own term', () => {
        expect(alignmentLabelKey('Unaligned', 'name')).toBe(
            'alignments.unaligned.name'
        );
        expect(alignmentLabelKey('lawful good', 'short')).toBe(
            'alignments.lawfulGood.short'
        );
        expect(alignmentLabelKey('any alignment', 'name')).toBeNull();
    });
});
