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

    const { CHARACTER_PROGRESSION_ACTIONS } = await import(
        '@/lib/server/assistant/actions/character-progression'
    );

    const { CHARACTER_ACTIONS } = await import(
        '@/lib/server/assistant/actions/characters'
    );

    const catalog = createActionCatalog([
        ...CHARACTER_ACTIONS,
        ...CHARACTER_PROGRESSION_ACTIONS,
    ]);

    idsFor = (system) =>
        catalog
            .listActions(dm, system ? parseRules({ system }) : undefined)
            .map((action) => action.id);
}, 30_000);

const PROGRESSION = [
    'characters.progression',
    'characters.progression.learn',
    'characters.progression.unlearn',
    'characters.progression.reset',
];

describe('assistant catalog follows the campaign composition', () => {
    it('bare dnd5e has neither skill-tree nor wfrp progression actions', () => {
        const ids = idsFor({ key: 'dnd5e' });

        for (const id of [...PROGRESSION, 'characters.advance'])
            expect(ids).not.toContain(id);

        expect(ids).toContain('characters.level-up');
        expect(ids).toContain('characters.progression.seen-level');
    });

    it('homm has the skill-tree actions and no wfrp ones', () => {
        const ids = idsFor({ key: 'homm' });

        for (const id of PROGRESSION) expect(ids).toContain(id);

        expect(ids).not.toContain('characters.advance');
    });

    it('wfrp has advance and no skill-tree or d20 actions', () => {
        const ids = idsFor({ key: 'wfrp' });

        expect(ids).toContain('characters.advance');

        for (const id of [...PROGRESSION, 'characters.level-up'])
            expect(ids).not.toContain(id);
    });

    it('without rules every action is listed', () => {
        const ids = idsFor();

        for (const id of [...PROGRESSION, 'characters.advance'])
            expect(ids).toContain(id);
    });
});
