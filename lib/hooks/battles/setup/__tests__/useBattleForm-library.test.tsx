// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('@/lib/hooks/common', () => ({
    useConfirm: () => vi.fn(),
    useNavigateFresh: () => vi.fn(),
    useNotify: () => vi.fn(),
}));
vi.mock('../../useBattles', () => ({
    useCreateBattle: () => ({ mutate: h.create, isPending: false }),
    useUpdateBattle: () => ({ mutate: h.update, isPending: false }),
    useDeleteBattle: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { useBattleForm } from '../useBattleForm';

import { DEFAULT_BATTLE_MAP } from '@/lib/constants/battle';
import type { BattlePreparationParticipant } from '@/types/battle';

const participants = [
    { id: 'u1', type: 'unit', side: 'enemy', quantity: 1 },
] as unknown as BattlePreparationParticipant[];

const formData = { name: 'B', description: '', turnTimerSeconds: null };

function submit(params: Partial<Parameters<typeof useBattleForm>[0]>) {
    const { result } = renderHook(() =>
        useBattleForm({
            campaignId: 'c',
            formData,
            participants,
            map: DEFAULT_BATTLE_MAP,
            ...params,
        })
    );

    result.current.actions.submit({ preventDefault: vi.fn() } as never);
}

describe('useBattleForm library map payload', () => {
    beforeEach(() => vi.clearAllMocks());

    it('sends mapId and no map when a library map is chosen', () => {
        submit({ library: { mapId: 'm1', isLinked: false } });

        const body = h.create.mock.calls[0][0];

        expect(body.mapId).toBe('m1');
        expect('map' in body).toBe(false);
    });

    it('sends map and no mapId without a library map', () => {
        submit({ library: { mapId: null, isLinked: false } });

        const body = h.create.mock.calls[0][0];

        expect(body.map).toBe(DEFAULT_BATTLE_MAP);
        expect('mapId' in body).toBe(false);
    });

    it('omits both when editing a linked battle', () => {
        submit({ battleId: 'b1', library: { mapId: 'm1', isLinked: true } });

        const body = h.update.mock.calls[0][0];

        expect('map' in body).toBe(false);
        expect('mapId' in body).toBe(false);
    });
});
