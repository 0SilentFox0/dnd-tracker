import { describe, expect, it } from 'vitest';

import { i18nNamespaces } from '../i18n-namespaces';

describe('i18nNamespaces', () => {
    it('lists packs and pages namespaces', () => {
        expect(
            i18nNamespaces({
                packs: { battle: ['a'], contentLibrary: ['b'] },
                pages: { draft: ['c'], character: ['d'] },
            })
        ).toEqual(['a', 'b', 'c', 'd']);
    });

    it('ignores budgetKb', () => {
        expect(
            i18nNamespaces({
                packs: { characterSheet: ['m'] },
                budgetKb: { packs: { characterSheet: 5 } },
            })
        ).toEqual(['m']);
    });
});
