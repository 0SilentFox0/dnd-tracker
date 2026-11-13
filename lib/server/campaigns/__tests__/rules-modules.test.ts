import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
    campaign: { findUnique: vi.fn(), update: vi.fn() },
    character: { count: vi.fn() },
    unit: { count: vi.fn() },
    battleScene: { count: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/server/content/write', () => ({
    withCampaignContentWrite: (_id: string, cb: (tx: unknown) => unknown) =>
        cb(db),
}));
vi.mock('@/lib/server/campaigns/condition-usage', () => ({
    findCustomConditionUsage: vi.fn(),
}));

import { API_ERRORS } from '@/lib/constants/api-errors';
import type { Actor } from '@/lib/utils/api/actor';
import { parseRules, type RulesetPatch } from '@/lib/utils/rules/schema';
import { sectionsOfSystem } from '@/lib/utils/rules/section-registry';
import {
    moduleCatalog,
    moduleToggles,
    PRESETS,
} from '@/lib/utils/rules/systems/catalog';

let updateCampaignRules: typeof import('@/lib/server/campaigns/rules').updateCampaignRules;

let systemServerOf: typeof import('@/lib/server/systems/registry').systemServerOf;

beforeAll(async () => {
    await import('@/lib/server/systems/registry');
    ({ systemServerOf } = await import('@/lib/server/systems/registry'));
    ({ updateCampaignRules } = await import('@/lib/server/campaigns/rules'));
}, 30_000);

const dm = {
    campaignId: 'c1',
    isDM: true,
    via: 'session',
    scopes: null,
} as Actor;

const player = { ...dm, isDM: false } as Actor;

let stored: Record<string, unknown>;

const setup = (
    raw: Record<string, unknown>,
    counts: { battle?: number; characters?: number } = {}
) => {
    stored = raw;
    db.battleScene.count.mockResolvedValue(counts.battle ?? 0);
    db.character.count.mockResolvedValue(counts.characters ?? 0);
    db.unit.count.mockResolvedValue(0);
};

const modulesPatch = (modules: string[], confirm?: true): RulesetPatch => ({
    system: { modules },
    ...(confirm && { confirm }),
});

const system = () => stored.system as { key: string; modules?: string[] };

const FULL = [...PRESETS.homm.modules].sort();

beforeEach(() => {
    vi.clearAllMocks();
    db.campaign.findUnique.mockImplementation(async () => ({ rules: stored }));
    db.campaign.update.mockImplementation(
        async ({ data }: { data: { rules: Record<string, unknown> } }) => {
            stored = data.rules;

            return {};
        }
    );
});

describe('module toggle through updateCampaignRules', () => {
    it('plan scenario: enable, blocked in battle, disable, re-enable', async () => {
        setup({ system: { key: 'dnd5e' }, morale: { enabled: true, cap: 4 } });

        const on = await updateCampaignRules(dm, modulesPatch(['morale']));

        expect(system().modules).toEqual(['morale']);
        expect(on.composition).toEqual({ base: 'd20', modules: ['morale'] });
        expect(sectionsOfSystem(on.system)).toHaveProperty('morale');
        expect(systemServerOf(on).battle).toHaveProperty('morale-check');

        const afterOn = structuredClone(stored);

        db.battleScene.count.mockResolvedValue(1);

        await expect(
            updateCampaignRules(dm, modulesPatch([]))
        ).rejects.toMatchObject({
            message: API_ERRORS.SYSTEM_MODULES_IN_BATTLE,
            status: 409,
        });
        expect(stored).toEqual(afterOn);

        db.battleScene.count.mockResolvedValue(0);

        const off = await updateCampaignRules(dm, modulesPatch([]));

        expect(sectionsOfSystem(off.system)).not.toHaveProperty('morale');
        expect(stored.morale).toEqual({ enabled: true, cap: 4 });

        await updateCampaignRules(dm, { outOfCombat: { xp: false } });

        expect(stored.morale).toEqual({ enabled: true, cap: 4 });

        const again = await updateCampaignRules(dm, modulesPatch(['morale']));

        expect(again.morale).toEqual(on.morale);
    });

    it('a prepared battle is not counted', async () => {
        setup({ system: { key: 'dnd5e' } });

        await updateCampaignRules(dm, modulesPatch(['morale']));

        expect(db.battleScene.count).toHaveBeenCalledWith({
            where: { campaignId: 'c1', status: 'active' },
        });
    });

    it('an unchanged set skips the battle and confirm gates', async () => {
        setup({ system: { key: 'dnd5e', modules: ['morale'] } }, { battle: 1 });

        await expect(
            updateCampaignRules(dm, modulesPatch(['morale']))
        ).resolves.toBeTruthy();
    });

    describe.each(moduleCatalog().addons.map((a) => a.id))('D16 %s', (id) => {
        it('off and on again leaves the raw JSON unchanged', async () => {
            const initial = {
                system: { key: 'homm' },
                morale: { enabled: true, cap: 6 },
                heroScaling: { hpBaseLevels: 5 },
            };

            setup(structuredClone(initial), { characters: 1 });

            const toggles = moduleToggles({ key: 'homm' });

            if (!toggles.find((t) => t.id === id)?.available) return;

            await updateCampaignRules(
                dm,
                modulesPatch(
                    FULL.filter((m) => m !== id),
                    true
                )
            );
            await updateCampaignRules(dm, modulesPatch(FULL, true));

            expect(stored).toEqual({
                ...initial,
                system: { key: 'homm', modules: FULL },
            });
        });
    });

    it('422 for modules of another base and for unknown ids', async () => {
        setup({ system: { key: 'wfrp' } });

        const wrong = await updateCampaignRules(
            dm,
            modulesPatch(['morale'])
        ).catch((e) => e);

        expect(wrong).toMatchObject({
            message: API_ERRORS.SYSTEM_MODULES_INVALID,
            status: 422,
        });
        expect(wrong.issues[0].path).toEqual(['system', 'modules']);
        expect(['wrongBase', 'missingRequires']).toContain(
            wrong.issues[0].message.split('.').pop()
        );

        setup({ system: { key: 'dnd5e' } });

        const unknown = await updateCampaignRules(
            dm,
            modulesPatch(['zzz'])
        ).catch((e) => e);

        expect(unknown.status).toBe(422);
        expect(unknown.issues[0].message).toBe(
            'rules.validation.composition.unknownModule'
        );
        expect(db.campaign.update).not.toHaveBeenCalled();
    });

    describe('confirmation of setup modules', () => {
        const withoutScaling = FULL.filter((m) => m !== 'heroscaling');

        it('is required with characters, in both directions', async () => {
            setup({ system: { key: 'homm' } }, { characters: 1 });

            const error = await updateCampaignRules(
                dm,
                modulesPatch(withoutScaling)
            ).catch((e) => e);

            expect(error).toMatchObject({
                message: API_ERRORS.SYSTEM_MODULE_CONFIRM,
                status: 409,
            });
            expect(error.issues[0].params.module).toBe('heroscaling');
            expect(db.campaign.update).not.toHaveBeenCalled();

            await expect(
                updateCampaignRules(dm, modulesPatch(withoutScaling, true))
            ).resolves.toBeTruthy();

            await expect(
                updateCampaignRules(dm, modulesPatch(FULL))
            ).rejects.toMatchObject({
                message: API_ERRORS.SYSTEM_MODULE_CONFIRM,
            });
        });

        it('is not required without characters', async () => {
            setup({ system: { key: 'homm' } });

            await expect(
                updateCampaignRules(dm, modulesPatch(withoutScaling))
            ).resolves.toBeTruthy();
        });

        it('is not required for a free module', async () => {
            setup({ system: { key: 'dnd5e', modules: [] } }, { characters: 1 });

            await expect(
                updateCampaignRules(dm, modulesPatch(['morale']))
            ).resolves.toBeTruthy();
        });
    });

    it('a player cannot change modules', async () => {
        setup({ system: { key: 'dnd5e' } });

        await expect(
            updateCampaignRules(player, modulesPatch(['morale']))
        ).rejects.toMatchObject({ status: 403 });
    });

    it('a key change keeps the patch modules or resets them', async () => {
        setup({ system: { key: 'homm' } });

        await updateCampaignRules(dm, {
            system: { key: 'dnd5e', modules: ['morale'] },
        });

        expect(system()).toEqual({ key: 'dnd5e', modules: ['morale'] });

        setup({ system: { key: 'homm', modules: FULL } });

        await updateCampaignRules(dm, { system: { key: 'dnd5e' } });

        expect(system()).toEqual({ key: 'dnd5e' });
    });

    it('the stored JSON never gets the confirm flag', async () => {
        setup({ system: { key: 'dnd5e' } });

        await updateCampaignRules(dm, modulesPatch(['morale'], true));

        expect(stored).not.toHaveProperty('confirm');
        expect(parseRules(stored).system.modules).toEqual(['morale']);
    });
});
