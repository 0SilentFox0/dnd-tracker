import { describe, expect, it } from 'vitest';

import { hiddenContentRows } from '../content-kinds-report';

const campaigns = [
    { id: 'bare', rules: { system: { key: 'dnd5e' } } },
    {
        id: 'trees',
        rules: { system: { key: 'dnd5e', modules: ['skilltrees'] } },
    },
    { id: 'homm', rules: { system: { key: 'homm' } } },
    { id: 'wfrp', rules: { system: { key: 'wfrp' } } },
];

describe('hiddenContentRows', () => {
    it('main-skills in a bare dnd5e is hidden', () => {
        expect(
            hiddenContentRows(campaigns, [
                { campaignId: 'bare', kind: 'main-skills', count: 3 },
            ])
        ).toEqual([{ campaignId: 'bare', kind: 'main-skills', count: 3 }]);
    });

    it('the same rows are fine with the skilltrees module and in homm', () => {
        expect(
            hiddenContentRows(campaigns, [
                { campaignId: 'trees', kind: 'main-skills', count: 3 },
                { campaignId: 'homm', kind: 'main-skills', count: 3 },
                { campaignId: 'homm', kind: 'classes', count: 5 },
                { campaignId: 'homm', kind: 'artifact-sets', count: 6 },
            ])
        ).toEqual([]);
    });

    it('classes in wfrp are hidden, careers there are not; zero counts are ignored', () => {
        expect(
            hiddenContentRows(campaigns, [
                { campaignId: 'wfrp', kind: 'classes', count: 2 },
                { campaignId: 'wfrp', kind: 'careers', count: 9 },
                { campaignId: 'bare', kind: 'careers', count: 0 },
            ])
        ).toEqual([{ campaignId: 'wfrp', kind: 'classes', count: 2 }]);
    });
});
