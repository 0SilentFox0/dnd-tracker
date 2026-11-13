import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: {} }));

import type { Actor } from '@/lib/utils/api/actor';
import { parseRules } from '@/lib/utils/rules/schema';

const dm: Actor = {
    campaignId: 'camp',
    userId: 'dm',
    isDM: true,
    via: 'session',
    scopes: null,
};

let idsFor: (system?: object) => string[];

beforeAll(async () => {
    await import('@/lib/server/systems/registry');

    const { createActionCatalog } = await import(
        '@/lib/server/assistant/catalog'
    );

    const { createContentActions } = await import(
        '@/lib/server/assistant/actions/content'
    );

    const catalog = createActionCatalog(createContentActions());

    idsFor = (system) =>
        catalog
            .listActions(dm, system ? parseRules({ system }) : undefined)
            .map((action) => action.id);
}, 30_000);

describe('assistant content actions follow the composition', () => {
    it('bare dnd5e has no careers and no skill-tree content actions', () => {
        const ids = idsFor({ key: 'dnd5e' });

        expect(ids).toContain('content.classes.list');
        expect(ids).toContain('content.spells.list');
        expect(ids.some((id) => id.startsWith('content.careers.'))).toBe(false);
        expect(ids.some((id) => id.startsWith('content.main-skills.'))).toBe(
            false
        );
    });

    it('wfrp has careers but no classes', () => {
        const ids = idsFor({ key: 'wfrp' });

        expect(ids).toContain('content.careers.list');
        expect(ids).not.toContain('content.classes.list');
    });

    it('homm has every module kind but careers', () => {
        const ids = idsFor({ key: 'homm' });

        expect(ids).toContain('content.main-skills.list');
        expect(ids).toContain('content.artifact-sets.list');
        expect(ids).not.toContain('content.careers.list');
    });

    it('without rules every kind is listed', () => {
        expect(idsFor()).toContain('content.careers.list');
    });
});
