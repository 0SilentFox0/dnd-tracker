import type { Spell } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { context, goblin, participant } from './fixtures';

import '@/lib/server/systems/registry';
import { ParticipantSide } from '@/lib/constants/battle';
import { createSpellMutation } from '@/lib/server/battles/mutations/spell/spell-mutation';
import { counterPendingOf } from '@/lib/utils/battle/counter/pending';
import type { InterruptSpell } from '@/lib/utils/battle/counter/types';

const spellRow = {
    id: 's1',
    campaignId: 'c1',
    name: 'Fire Bolt',
    level: 1,
    groupId: null,
    icon: null,
    dice: 1,
    cost: 'action',
    targeting: { kind: 'enemy' },
    resolution: { kind: 'auto' },
    spellEffects: [
        { kind: 'dealDamage', amount: { spellRoll: 100 }, damageType: 'fire' },
    ],
    raceModifiers: [],
} as unknown as Spell;

const COUNTER: InterruptSpell = {
    id: 'cs',
    name: 'Counterspell',
    level: 3,
    range: 60,
};

const caster = participant(
    'hero',
    { controlledBy: 'user-1' },
    {
        spellcasting: {
            spellSlots: { '1': { max: 2, current: 2 } },
            knownSpells: ['s1'],
        },
    }
);

const mage = participant(
    'mage',
    { side: ParticipantSide.ENEMY, controlledBy: 'dm', name: 'Mage' },
    {
        spellcasting: {
            spellSlots: { '3': { max: 1, current: 1 } },
            knownSpells: ['cs'],
        },
    }
);

const body = (over: Record<string, unknown> = {}) =>
    ({
        casterId: 'hero',
        spellId: 's1',
        targetIds: ['gob'],
        diceRolls: [4],
        ...over,
    }) as never;

const make = (
    loadInterruptSpells?: (...a: [string, string[]]) => Promise<InterruptSpell[]>,
    options: Parameters<typeof createSpellMutation>[1] = {}
) =>
    createSpellMutation(
        {
            loadSpell: vi.fn(async () => spellRow),
            loadPool: async () => ({ units: [], races: [] }),
            ...(loadInterruptSpells && { loadInterruptSpells }),
        },
        options
    );

const ctx = () => context({ participants: [caster, goblin, mage] });

describe('counter window in the spell mutation', () => {
    it('pauses the cast with a counter window and writes nothing else', async () => {
        const load = vi.fn(async () => [COUNTER]);

        const base = ctx();

        const out = await make(load)(base, body());

        const pending = counterPendingOf(out.scene?.pendingChoice);

        expect(load).toHaveBeenCalledWith('c1', ['s1', 'cs']);
        expect(pending?.shown.offers).toEqual([
            { reactorId: 'mage', spellId: 'cs', slotLevels: [3], dm: true },
        ]);
        expect(pending?.shown.actorId).toBe('hero');
        expect(pending?.hidden.request).toMatchObject({ spellId: 's1' });
        expect(out.participants).toBe(base.participants);
        expect(out.events).toEqual([]);
        expect(out.response).toEqual({ pendingChoice: true });
    });

    it.each([
        ['preview', body({ preview: true }), {}],
        ['skipCounter', body(), { skipCounter: true }],
    ])('opens no window for %s', async (_name, data, options) => {
        const load = vi.fn(async () => [COUNTER]);

        const out = await make(load, options)(ctx(), data);

        expect(counterPendingOf(out.scene?.pendingChoice)).toBeNull();
        expect(load).not.toHaveBeenCalled();
    });

    it('opens no window on a replay with a stored seed', async () => {
        const load = vi.fn(async () => [COUNTER]);

        const out = await make(load)(ctx(), body(), undefined, { seed: 7 });

        expect(counterPendingOf(out.scene?.pendingChoice)).toBeNull();
        expect(out.events).toHaveLength(1);
    });

    it('makes no extra query when nobody can react', async () => {
        const load = vi.fn(async () => [COUNTER]);

        const out = await make(load)(
            context({ participants: [caster, goblin] }),
            body()
        );

        expect(load).not.toHaveBeenCalled();
        expect(out.events).toHaveLength(1);
    });

    it('opens no window when the reactor has no interrupt spell', async () => {
        const out = await make(async () => [])(ctx(), body());

        expect(counterPendingOf(out.scene?.pendingChoice)).toBeNull();
    });
});
