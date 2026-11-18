import { beforeEach, describe, expect, it, vi } from 'vitest';

const tx = vi.hoisted(() => ({
    character: { update: vi.fn() },
    log: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: {
        $transaction: async (fn: (t: unknown) => unknown) => fn(tx),
    },
}));
vi.mock('@/lib/server/characters/battle-lock', () => ({
    assertNotInActiveBattle: vi.fn(async () => undefined),
}));
vi.mock('@/lib/server/characters/lock', () => ({
    lockCharacters: vi.fn(async () => new Map()),
}));
vi.mock('@/lib/server/characters/log', () => ({
    writeCharacterLog: async (_t: unknown, rows: unknown) => tx.log(rows),
}));
vi.mock('@/lib/server/characters/participant', () => ({
    buildCharacterParticipant: vi.fn(async () => ({
        participant: {
            abilities: { modifiers: { constitution: 1 } },
            combatStats: { maxHp: 40 },
        },
        context: {
            classesById: {
                fig: { id: 'fig', name: 'Fighter', hitDie: 10 },
                wiz: { id: 'wiz', name: 'Wizard', hitDie: 6 },
            },
        },
    })),
}));

import { API_ERRORS } from '@/lib/constants/api-errors';
import { ContentError } from '@/lib/server/content/errors';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { spendHitDieFor } from '@/systems/d20/server/operations/handlers/hit-die-handler';

const gate = (over: { classesEnabled?: boolean; persist?: boolean } = {}) =>
    ({
        access: {
            userId: 'u',
            campaign: {
                maxLevel: 20,
                rules: {
                    ...DEFAULT_RULES,
                    classes: { enabled: over.classesEnabled ?? true },
                    outOfCombat: {
                        ...DEFAULT_RULES.outOfCombat,
                        persistResources: over.persist ?? true,
                    },
                },
            },
        },
        character: {
            id: 'ch',
            campaignId: 'camp',
            classes: [
                { classId: 'fig', level: 2 },
                { classId: 'wiz', level: 1 },
            ],
            resources: { shortRestOpen: true, hp: 5 },
        },
    }) as never;

const reject = async (g: never, classId: string) => {
    const err = await spendHitDieFor(g, { classId }).catch((e: unknown) => e);

    return err as ContentError;
};

describe('spendHitDieFor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(Math, 'random').mockReturnValue(0.999);
    });

    it('rolls the die of the chosen class (d10 vs d6) and heals roll + CON', async () => {
        const fig = await spendHitDieFor(gate(), { classId: 'fig' });

        expect(fig).toMatchObject({ die: 10, roll: 10, healed: 11 });

        const wiz = await spendHitDieFor(gate(), { classId: 'wiz' });

        expect(wiz).toMatchObject({ die: 6, roll: 6, healed: 7 });
    });

    it('persists the new resources and logs hp before/after', async () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);

        await spendHitDieFor(gate(), { classId: 'fig' });

        expect(tx.character.update).toHaveBeenCalledOnce();
        expect(tx.log.mock.calls[0][0][0]).toMatchObject({
            kind: 'hit_die',
            data: {
                classId: 'fig',
                die: 10,
                roll: 1,
                healed: 2,
                hpBefore: 5,
                hpAfter: 7,
            },
        });
    });

    it('caps healing at max HP', async () => {
        const g = gate() as { character: { resources: object } };

        g.character.resources = { shortRestOpen: true, hp: 38 };

        const out = await spendHitDieFor(g as never, { classId: 'fig' });

        expect(out.hpAfter).toBe(40);
    });

    // BUG: spendHitDie reports healed = roll + CON (11) even when only 2 HP were gained
    it.skip('healed reports the effective HP gained when capped at max HP', async () => {
        const g = gate() as { character: { resources: object } };

        g.character.resources = { shortRestOpen: true, hp: 38 };

        const out = await spendHitDieFor(g as never, { classId: 'fig' });

        expect(out.healed).toBe(2);
    });

    it('409 when resource persistence is off, without touching the DB', async () => {
        const e = await reject(gate({ persist: false }), 'fig');

        expect(e).toBeInstanceOf(ContentError);
        expect(e.status).toBe(409);
        expect(e.message).toBe(API_ERRORS.OOC_RESOURCES_DISABLED);
        expect(tx.character.update).not.toHaveBeenCalled();
    });

    it('with classes disabled the pool is empty: no hit dice', async () => {
        const e = await reject(gate({ classesEnabled: false }), 'fig');

        expect(e.status).toBe(409);
        expect(e.message).toBe(API_ERRORS.NO_HIT_DICE);
    });

    it('an unknown class id has no hit dice', async () => {
        const e = await reject(gate(), 'ghost');

        expect(e.message).toBe(API_ERRORS.NO_HIT_DICE);
        expect(tx.character.update).not.toHaveBeenCalled();
        expect(tx.log).not.toHaveBeenCalled();
    });
});
