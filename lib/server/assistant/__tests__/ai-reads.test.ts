import { expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: {} }));

import { AI_TOOLS } from '@/lib/ai/tools';
import { assistantCatalog } from '@/lib/server/assistant/catalog';
import { AI_READ_ACTIONS } from '@/lib/server/assistant/reads';
import type { Actor } from '@/lib/utils/api/actor';

const token = (scopes: Actor['scopes']): Actor => ({
    campaignId: 'c',
    userId: 'u',
    isDM: true,
    via: 'token',
    scopes,
});

it('every legacy read is a catalog read action gated by a read scope, never ai', () => {
    expect(AI_READ_ACTIONS).toHaveLength(12);

    for (const action of AI_READ_ACTIONS) {
        expect(assistantCatalog.getAction(action.id)).toBe(action);
        expect(action.effect).toBe('read');
        expect(action.need.scope).toMatch(/:read$/);
    }
});

it('a token sees a legacy read only with the catalog read scope', () => {
    const ids = (scopes: Actor['scopes']) =>
        assistantCatalog.listActions(token(scopes)).map((a) => a.id);

    expect(ids(['ai'])).not.toContain('scenario.page-read');
    expect(ids(['show:read'])).not.toContain('scenario.page-read');
    expect(ids(['scenario:read'])).toContain('scenario.page-read');
    expect(ids(['scenario:write'])).toContain('scenario.page-read');
});

it('tool scopes match the scope of the action they alias', () => {
    const byName = new Map(AI_TOOLS.map((t) => [t.name, t]));

    expect(byName.get('read_scenario_page')?.scopes).toEqual(['scenario:read']);
    expect(byName.get('get_party')?.scopes).toEqual(['characters:read']);
    expect(byName.get('get_battle_state')?.scopes).toEqual(['battles:read']);
    expect(byName.get('get_show_state')?.scopes).toEqual(['show:read']);
    expect(byName.get('get_campaign_brief')?.scopes).toEqual(['campaign:read']);
    expect(byName.get('search_reference')?.scopes).toEqual(['content:read']);
});
