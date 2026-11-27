import { describe, expect, it } from 'vitest';

import { demoDashboardSectionsFor } from '@/lib/constants/campaign-dashboard';
import { campaignSectionContext } from '@/lib/utils/campaigns/game-navigation';

describe('demoDashboardSectionsFor with a real composition context', () => {
    const keys = (rules: unknown) =>
        demoDashboardSectionsFor(
            campaignSectionContext({
                kind: 'demo',
                rules,
                mapLibraryEnabled: false,
            })
        ).map((s) => s.key);

    it('a bare 5e composition hides skills tiles and keeps player-world', () => {
        const k = keys({ system: { key: 'dnd5e' } });

        expect(k).toContain('player-world');
        expect(k).not.toContain('skill-trees');
    });

    it('a homm composition shows skills tiles', () => {
        expect(keys({ system: { key: 'homm' } })).toEqual(
            expect.arrayContaining(['skills', 'skill-trees'])
        );
    });
});
