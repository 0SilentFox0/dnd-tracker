import { describe, expect, it } from 'vitest';

import { fogQualityOf } from '../useFogQuality';

const base = { reduced: false, hidden: false, compact: false };

describe('fogQualityOf', () => {
    it('is live on a capable desktop', () => {
        expect(fogQualityOf({ ...base, memory: 8, cores: 8 })).toBe('live');
        expect(fogQualityOf(base)).toBe('live');
    });

    it('freezes for reduced motion and hidden pages', () => {
        expect(fogQualityOf({ ...base, reduced: true })).toBe('still');
        expect(fogQualityOf({ ...base, hidden: true })).toBe('still');
    });

    it('freezes a modest phone but keeps a strong one live', () => {
        expect(fogQualityOf({ ...base, compact: true, cores: 4 })).toBe('still');
        expect(fogQualityOf({ ...base, compact: true, cores: 8 })).toBe('live');
    });

    it('goes flat on saveData, slow links and weak devices', () => {
        expect(fogQualityOf({ ...base, saveData: true })).toBe('flat');
        expect(fogQualityOf({ ...base, effectiveType: '2g' })).toBe('flat');
        expect(fogQualityOf({ ...base, memory: 2 })).toBe('flat');
        expect(fogQualityOf({ ...base, cores: 2, reduced: true })).toBe('flat');
    });
});
