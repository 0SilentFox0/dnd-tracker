import { describe, expect, it } from 'vitest';

import { i18nNamespaces } from '../i18n-namespaces';

describe('i18nNamespaces', () => {
    it('lists slots and pages namespaces', () => {
        expect(
            i18nNamespaces({
                battle: ['a'],
                dm: ['b'],
                pages: { draft: ['c'], character: ['d'] },
            })
        ).toEqual(['a', 'b', 'c', 'd']);
    });

    it('ignores budgetKb', () => {
        expect(
            i18nNamespaces({ member: ['m'], budgetKb: { member: 5 } })
        ).toEqual(['m']);
    });
});
