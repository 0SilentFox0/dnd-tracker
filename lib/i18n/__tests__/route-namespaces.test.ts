import { describe, expect, it } from 'vitest';

import {
    campaignPages,
    routeGraph,
} from '@/lib/i18n/test/route-namespaces';

describe('routeGraph', () => {
    it('finds the campaign pages', () => {
        expect(campaignPages()).toContain(
            'app/campaigns/[id]/dm/spells/page.tsx'
        );
        expect(campaignPages().length).toBeGreaterThan(55);
    });

    it('sees hook uses on the dashboard', () => {
        const g = routeGraph('app/campaigns/[id]/page.tsx');

        expect(
            g.uses.some((u) => u.ns === 'dashboard' && u.kind === 'hook')
        ).toBe(true);
        expect(g.usesBase).toBe(true);
    });

    it('sees the battleCommon read on dm/rules (known hole)', () => {
        const g = routeGraph('app/campaigns/[id]/dm/rules/page.tsx');

        expect(
            g.uses.some(
                (u) =>
                    u.ns === 'battleCommon' &&
                    u.file.endsWith('SummaryStep.tsx')
            )
        ).toBe(true);
    });

    it('follows dynamic imports', () => {
        const g = routeGraph(
            'app/campaigns/[id]/battles/[battleId]/page.tsx'
        );

        expect(g.files.has('components/battle/dm/CompleteBattleDialog.tsx')).toBe(
            true
        );
    });

    it('chain lists ancestor layouts root-first', () => {
        const g = routeGraph(
            'app/campaigns/[id]/dm/battles/[battleId]/page.tsx'
        );

        expect(g.chain.slice(0, 3)).toEqual([
            'app/campaigns/layout.tsx',
            'app/campaigns/[id]/layout.tsx',
            'app/campaigns/[id]/dm/layout.tsx',
        ]);
    });
});
