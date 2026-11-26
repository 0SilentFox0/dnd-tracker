// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    create: vi.fn(),
    update: vi.fn(),
    start: vi.fn(),
    push: vi.fn(),
    notify: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: h.push, refresh: vi.fn() }),
}));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('@/lib/api/battles', () => ({ startBattle: h.start }));
vi.mock('@/lib/hooks/common', () => ({
    useConfirm: () => vi.fn(),
    useNavigateFresh: () => vi.fn(),
    useNotify: () => h.notify,
}));
vi.mock('../../useBattles', () => ({
    useCreateBattle: () => ({ mutate: h.create, isPending: false }),
    useUpdateBattle: () => ({ mutate: h.update, isPending: false }),
    useDeleteBattle: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { useBattleForm } from '../useBattleForm';

import type { BattlePreparationParticipant } from '@/types/battle';

const participants = [
    { id: 'u1', type: 'unit', side: 'enemy', quantity: 1 },
] as unknown as BattlePreparationParticipant[];

async function submit(opts?: { start?: boolean }) {
    const { result } = renderHook(() =>
        useBattleForm({
            campaignId: 'c',
            formData: { name: 'B', description: '', turnTimerSeconds: null },
            participants,
        })
    );

    result.current.actions.submit({ preventDefault: vi.fn() } as never, opts);

    const onSuccess = h.create.mock.calls[0]?.[1]?.onSuccess;

    await onSuccess?.({ id: 'b1' });
}

describe('useBattleForm create and start', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        h.start.mockResolvedValue({});
    });

    it('start: true starts the battle once and then navigates', async () => {
        await submit({ start: true });

        expect(h.start).toHaveBeenCalledTimes(1);
        expect(h.start).toHaveBeenCalledWith('c', 'b1', {});
        expect(h.push).toHaveBeenCalledWith('/campaigns/c/battles/b1');
    });

    it('a failed start notifies and still navigates', async () => {
        h.start.mockRejectedValue(new Error('boom'));

        await submit({ start: true });

        expect(h.notify).toHaveBeenCalledWith('boom');
        expect(h.push).toHaveBeenCalledWith('/campaigns/c/dm/battles/b1');
    });

    it('without start the behaviour is unchanged', async () => {
        await submit();

        expect(h.start).not.toHaveBeenCalled();
        expect(h.push).toHaveBeenCalledWith('/campaigns/c/dm/battles/b1');
    });
});
