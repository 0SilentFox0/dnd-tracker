import { describe, expect, it } from 'vitest';

import { biographyLead } from '../lead';

describe('biographyLead', () => {
    it('skips headings and returns the first paragraph as plain text', () => {
        expect(
            biographyLead(
                '# Origins\n\nBorn **in** a village.\n\n## Later\n\nMore.'
            )
        ).toBe('Born in a village.');
    });

    it('returns null for empty or heading-only input', () => {
        expect(biographyLead(null)).toBeNull();
        expect(biographyLead('# Title')).toBeNull();
    });
});
