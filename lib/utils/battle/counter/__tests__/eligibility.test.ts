import { describe, expect, it, vi } from 'vitest';

import { counterReactors, type CounterReactorsArgs } from '../eligibility';

import { ParticipantSide } from '@/lib/constants/battle';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { noReactions } from '@/lib/utils/battle/actions/none';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { BattleParticipant, SpellGrant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

const mocks = vi.hoisted(() => ({ off: false }));

vi.mock('@/lib/utils/battle/actions/access', async (importOriginal) => {
    const original = await importOriginal<
        typeof import('@/lib/utils/battle/actions/access')
    >();

    const { noReactions: none } = await import('@/lib/utils/battle/actions/none');

    return {
        ...original,
        reactionsOf: (rules: Parameters<typeof original.reactionsOf>[0]) =>
            mocks.off ? none : original.reactionsOf(rules),
    };
});

const COUNTER = { id: 'cs', name: 'Counterspell', level: 3, range: 60 };

const map: BattleMapConfig = {
    cols: 60,
    rows: 10,
    background: null,
    opacity: 0.3,
};

const at = (p: BattleParticipant, x: number): BattleParticipant => ({
    ...p,
    battleData: { ...p.battleData, position: { x, y: 5 } },
});

const caster = at(
    createMockParticipant({
        basicInfo: {
            ...createMockParticipant().basicInfo,
            id: 'caster',
            side: ParticipantSide.ENEMY,
        },
    }),
    0
);

const wizard = (over: Partial<BattleParticipant> = {}, x = 6) =>
    at(
        createMockParticipant({
            basicInfo: {
                ...createMockParticipant().basicInfo,
                id: 'wiz',
                side: ParticipantSide.ALLY,
            },
            spellcasting: {
                spellSlots: { '3': { max: 2, current: 2 } },
                knownSpells: ['cs'],
            },
            ...over,
        }),
        x
    );

const run = (
    reactor: BattleParticipant,
    over: Partial<CounterReactorsArgs> = {}
) =>
    counterReactors({
        caster,
        castSpell: { level: 3 },
        participants: [caster, reactor],
        interruptSpells: [COUNTER],
        rules: DEFAULT_RULES,
        map,
        round: 1,
        ...over,
    });

describe('counterReactors', () => {
    it('offers an enemy wizard with a slot in range', () => {
        expect(run(wizard())).toEqual([
            {
                reactorId: 'wiz',
                spellId: 'cs',
                slotLevels: [3],
                dm: false,
            },
        ]);
    });

    it('skips reactors that cannot answer', () => {
        const used = wizard();

        used.actionFlags.hasUsedReaction = true;

        const empty = wizard({
            spellcasting: {
                spellSlots: { '2': { max: 2, current: 2 } },
                knownSpells: ['cs'],
            },
        });

        const ally = wizard();

        ally.basicInfo.side = ParticipantSide.ENEMY;

        expect(run(used)).toEqual([]);
        expect(run(empty)).toEqual([]);
        expect(run(ally)).toEqual([]);
        expect(run(wizard({}, 13))).toEqual([]);
    });

    it('needs the cast spell to have components', () => {
        const none = { v: false, s: false, m: false };

        expect(run(wizard(), { castSpell: { level: 3, components: none } })).toEqual(
            []
        );
        expect(run(wizard(), { castSpell: { level: 3 } })).toHaveLength(1);
    });

    it('ignores level-0 pseudo casts without components but keeps real cantrips', () => {
        expect(run(wizard(), { castSpell: { level: 0 } })).toEqual([]);

        expect(
            run(wizard(), {
                castSpell: { level: 0, components: { v: true, s: false, m: false } },
            })
        ).toHaveLength(1);
    });

    it('offers a live grant with a charge and none for an exhausted one', () => {
        const grant: SpellGrant = {
            spellId: 'cs',
            key: 'g1',
            pool: 'spell:cs',
            cost: 1,
        };

        const withPool = (left: number) =>
            wizard({
                spellcasting: {
                    spellSlots: {},
                    knownSpells: ['cs'],
                    grants: [grant],
                },
                battleData: {
                    ...wizard().battleData,
                    pools: {
                        'spell:cs': { label: 'cs', max: 3, rest: null },
                    },
                    abilityUsage: {
                        'spell:cs': {
                            battle: 3 - left,
                            round: 0,
                            turn: 0,
                        },
                    },
                },
            });

        expect(run(withPool(1))).toEqual([
            {
                reactorId: 'wiz',
                spellId: 'cs',
                grantKey: 'g1',
                slotLevels: [],
                dm: false,
            },
        ]);
        expect(run(withPool(0))).toEqual([]);
    });

    it('offers nothing in a system without reactions', () => {
        mocks.off = true;

        expect(noReactions.blocker(wizard())).not.toBeNull();
        expect(run(wizard())).toEqual([]);

        mocks.off = false;
    });

    it('ignores range and sight without a map', () => {
        expect(run(wizard({}, 40), { map: null })).toHaveLength(1);
    });
});
