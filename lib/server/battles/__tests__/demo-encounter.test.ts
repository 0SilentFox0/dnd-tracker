import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildMockParticipants } from '@/lib/hooks/battle/mock-participants';
import type { BattleScene } from '@/types/api';

const findMany = vi.hoisted(() => vi.fn());

const fromUnit = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ prisma: { unit: { findMany } } }));
vi.mock('@/lib/utils/battle/participant/from-unit', () => ({
    createBattleParticipantFromUnit: fromUnit,
}));

import { buildDemoEncounter } from '../demo-encounter';

const scene = {
    id: 'b1',
    campaignId: 'c1',
    participants: [
        { id: 'u-ally', type: 'unit', side: 'ally', quantity: 1 },
        { id: 'u-foe', type: 'unit', side: 'enemy', quantity: 3, reserved: 1 },
        { id: 'missing', type: 'unit', side: 'enemy', quantity: 1 },
    ],
} as unknown as BattleScene;

describe('buildDemoEncounter', () => {
    beforeEach(() => {
        findMany.mockResolvedValue([{ id: 'u-ally' }, { id: 'u-foe' }]);
        fromUnit.mockImplementation(
            async (
                unit: { id: string },
                _battle: string,
                _side: string,
                n: number
            ) => {
                const base = buildMockParticipants()[0];

                return {
                    ...base,
                    basicInfo: { ...base.basicInfo, id: `${unit.id}-${n}` },
                };
            }
        );
    });

    it('builds one participant per unit copy from seeded unit rows, skipping reserved and unknown entries', async () => {
        const built = await buildDemoEncounter(scene);

        expect(findMany).toHaveBeenCalledWith({
            where: {
                campaignId: 'c1',
                id: { in: ['u-ally', 'u-foe', 'missing'] },
            },
        });
        expect(built.map((p) => p.basicInfo.id)).toEqual([
            'u-ally-1',
            'u-foe-1',
            'u-foe-2',
        ]);
        expect(fromUnit).toHaveBeenCalledWith(
            { id: 'u-foe' },
            'b1',
            'enemy',
            2
        );
        expect(built.every((p) => p.battleData.position)).toBe(true);
    });
});
