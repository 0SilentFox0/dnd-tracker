import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const loadRules = vi.hoisted(() => vi.fn());

vi.mock('@/lib/server/campaigns/rules', () => ({ loadRules }));

import { API_ERRORS } from '@/lib/constants/api-errors';
import { ContentError } from '@/lib/server/content/errors';
import {
    assertCampaignEffects,
    assertEffectsInComposition,
    storedEffectOwners,
} from '@/lib/server/content/traits-guard';
import { ownershipOf } from '@/lib/utils/abilities/registry/effects/ownership';
import type { Actor } from '@/lib/utils/api/actor';

const own = ownershipOf([], { moraleChance: 'morale' });

const ability = (effect: { kind: string; [k: string]: unknown }) => [
    { effects: [effect] },
];

const morale = ability({ kind: 'flag', flag: 'moraleChance', value: 10 });

describe('assertEffectsInComposition', () => {
    it('rejects a wfrp effect in dnd5e with 422', () => {
        expect(() =>
            assertEffectsInComposition(
                { key: 'dnd5e' },
                ability({ kind: 'wfrpWard', value: 9 })
            )
        ).toThrowError(
            expect.objectContaining({
                message: API_ERRORS.EFFECT_OUTSIDE_COMPOSITION,
                status: 422,
            })
        );
    });

    it('accepts a wfrp effect in wfrp and a core effect anywhere', () => {
        expect(() =>
            assertEffectsInComposition(
                { key: 'wfrp' },
                ability({ kind: 'wfrpWard', value: 9 })
            )
        ).not.toThrow();
        expect(() =>
            assertEffectsInComposition(
                { key: 'dnd5e' },
                ability({ kind: 'heal' })
            )
        ).not.toThrow();
    });

    it('morale flag passes in dnd5e + morale', () => {
        expect(() =>
            assertEffectsInComposition(
                { key: 'dnd5e', modules: ['morale'] },
                morale,
                [],
                own
            )
        ).not.toThrow();
    });

    it('morale flag in bare dnd5e → 422', () => {
        expect(() =>
            assertEffectsInComposition(
                { key: 'dnd5e', modules: [] },
                morale,
                [],
                own
            )
        ).toThrowError(expect.objectContaining({ status: 422 }));
    });

    it('looks inside randomOf options', () => {
        expect(() =>
            assertEffectsInComposition(
                { key: 'dnd5e' },
                ability({
                    kind: 'randomOf',
                    options: [{ kind: 'wfrpWard', value: 9 }],
                })
            )
        ).toThrowError(expect.objectContaining({ status: 422 }));
    });

    it('real registry: morale flag needs the morale module', () => {
        expect(() =>
            assertEffectsInComposition({ key: 'dnd5e' }, morale)
        ).toThrowError(expect.objectContaining({ status: 422 }));
        expect(() =>
            assertEffectsInComposition(
                { key: 'dnd5e', modules: ['morale'] },
                morale
            )
        ).not.toThrow();
        expect(() =>
            assertEffectsInComposition({ key: 'homm' }, morale)
        ).not.toThrow();
    });

    it('real registry: d20 proficiency flags are rejected outside a d20 base', () => {
        expect(() =>
            assertEffectsInComposition(
                { key: 'wfrp' },
                ability({
                    kind: 'flag',
                    flag: 'saveProficiency',
                    abilities: ['wisdom'],
                })
            )
        ).toThrowError(expect.objectContaining({ status: 422 }));
    });
});

describe('update keeps legacy effects', () => {
    const bare = { key: 'dnd5e' };

    it('existing morale flag: resubmitting it passes, adding a new morale flag fails', () => {
        expect(() =>
            assertEffectsInComposition(bare, morale, morale)
        ).not.toThrow();
        expect(() =>
            assertEffectsInComposition(
                bare,
                [
                    ...morale,
                    ...ability({ kind: 'flag', flag: 'minMorale', value: 1 }),
                ],
                morale
            )
        ).toThrowError(expect.objectContaining({ status: 422 }));
    });

    it('storedEffectOwners tolerates garbage', () => {
        expect(storedEffectOwners(null)).toEqual([]);
        expect(
            storedEffectOwners([null, { effects: [] }, { name: 'x' }])
        ).toEqual([{ effects: [] }]);
    });
});

const mkActor = (campaignId = 'c1'): Actor => ({
    campaignId,
    userId: 'u1',
    isDM: true,
    via: 'session',
    scopes: null,
});

const rulesOf = (key: string) => ({ system: { key } });

describe('assertCampaignEffects', () => {
    beforeEach(() => loadRules.mockReset());

    it('uses the system of the campaign the row is written to', async () => {
        loadRules.mockResolvedValue(rulesOf('dnd5e'));
        await expect(
            assertCampaignEffects(mkActor(), morale)
        ).rejects.toMatchObject({ status: 422 });

        loadRules.mockResolvedValue(rulesOf('homm'));
        await expect(
            assertCampaignEffects(mkActor(), morale)
        ).resolves.toBeUndefined();
    });

    it('an unknown campaign rejects with the loader error', async () => {
        loadRules.mockRejectedValue(
            new ContentError(API_ERRORS.CAMPAIGN_NOT_FOUND, 404)
        );
        await expect(
            assertCampaignEffects(mkActor('gone'), morale)
        ).rejects.toMatchObject({
            message: API_ERRORS.CAMPAIGN_NOT_FOUND,
            status: 404,
        });
    });

    it('skips the rules load when there are no abilities', async () => {
        await assertCampaignEffects(mkActor(), undefined);
        expect(loadRules).not.toHaveBeenCalled();
    });

    it('loads rules once for repeated calls with the same actor', async () => {
        loadRules.mockResolvedValue(rulesOf('homm'));

        const actor = mkActor();

        await assertCampaignEffects(actor, morale);
        await assertCampaignEffects(actor, morale);
        expect(loadRules).toHaveBeenCalledTimes(1);
    });

    it('loads rules per actor for different actors', async () => {
        loadRules.mockResolvedValue(rulesOf('homm'));
        await assertCampaignEffects(mkActor(), morale);
        await assertCampaignEffects(mkActor(), morale);
        expect(loadRules).toHaveBeenCalledTimes(2);
    });
});
