import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fromCharacter: vi.fn(), fromUnit: vi.fn() }));

vi.mock('@/lib/db', () => ({
    prisma: {
        character: { findMany: vi.fn(async () => [{ id: 'h1' }]) },
        unit: { findMany: vi.fn(async () => [{ id: 'u1' }]) },
    },
}));
vi.mock('@/lib/server/battles/mutations/start/start-build-context', () => ({
    buildCampaignContextForStart: vi.fn(async () => ({
        campaignContext: {},
        racesById: {},
    })),
}));
vi.mock('@/lib/server/battles/mutations/start/start-fair-scaling', () => ({
    scaleEnemiesForFairBattle: vi.fn(
        async (_c: string, _s: unknown, built: unknown[]) => built
    ),
}));
vi.mock('@/lib/utils/battle/participant', () => ({
    createBattleParticipantFromCharacter: mocks.fromCharacter,
    createBattleParticipantFromUnit: mocks.fromUnit,
}));

import { ParticipantSide } from '@/lib/constants/battle';
import { buildStartOrder } from '@/lib/server/battles/mutations/start/start-battle-handler';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { wfrpAbilitiesOf } from '@/systems/wfrp/rules/combat/participant';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { wfrpState } from '@/systems/wfrp/rules/state';
import { trait } from '@/systems/wfrp/rules/traits/__tests__/fixtures';

const setup = [
    { id: 'h1', type: 'character' as const, side: 'ally' },
    { id: 'u1', type: 'unit' as const, side: 'enemy', quantity: 1 },
];

const scary = () =>
    makeParticipant({
        id: 'w1',
        side: ParticipantSide.ENEMY,
        abilities: [
            trait([{ kind: 'wfrpPsychology', psychology: 'fear', value: 1 }]),
        ],
    });

const hero = () => {
    const p = makeParticipant({ id: 'h1' });

    return {
        ...p,
        abilities: {
            ...p.abilities,
            ...wfrpAbilitiesOf(DEFAULT_CHARACTERISTICS),
        },
    };
};

describe('buildStartOrder: психологія wfrp', () => {
    it('wfrp-бій з Fear-юнітом дає окремий запис журналу з тестованими як targets', async () => {
        mocks.fromCharacter.mockResolvedValue(hero());
        mocks.fromUnit.mockImplementation(async () => scary());

        const out = await buildStartOrder(
            'b1',
            'c1',
            setup as never,
            null,
            WFRP_RULES
        );

        const entry = out.triggerLogEntries.find((e) =>
            e.id.startsWith('psychology-start')
        );

        expect(entry?.targets).toEqual([
            { participantId: 'h1', participantName: 'h1' },
        ]);
        expect(
            wfrpState(out.order.find((p) => p.basicInfo.id === 'h1')!)
                .psychologyTested
        ).toEqual({ fear: 1 });
    });

    it('d20-бій без тесту', async () => {
        mocks.fromCharacter.mockResolvedValue(hero());
        mocks.fromUnit.mockImplementation(async () => scary());

        const out = await buildStartOrder(
            'b1',
            'c1',
            setup as never,
            null,
            DEFAULT_RULES
        );

        expect(out.triggerLogEntries).toEqual([]);
    });
});
