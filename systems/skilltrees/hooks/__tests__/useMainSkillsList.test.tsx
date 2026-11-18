// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    confirm: vi.fn(),
    mutateOk: vi.fn(),
    live: undefined as unknown[] | undefined,
}));

vi.mock('@/lib/hooks/common', async (original) => ({
    ...(await original<object>()),
    useConfirm: () => h.confirm,
}));
vi.mock('@/lib/hooks/skills', () => ({
    useMainSkills: (_c: string, opts: { initialData: unknown[] }) => ({
        data: h.live ?? opts.initialData,
    }),
    useDeleteMainSkill: () => ({ mutateOk: h.mutateOk }),
}));

import { useMainSkillsList } from '@/systems/skilltrees/hooks/useMainSkillsList';
import type { MainSkill } from '@/types/main-skills';

const initial = [{ id: 'a', name: 'Attack' }] as MainSkill[];

describe('useMainSkillsList', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        h.live = undefined;
    });
    afterEach(cleanup);

    it('lists the initial branches until live data replaces them', () => {
        const { result, rerender } = renderHook(() =>
            useMainSkillsList('c', initial)
        );

        expect(result.current.total).toBe(1);

        h.live = [...initial, { id: 'b', name: 'Magic' }] as MainSkill[];
        rerender();

        expect(result.current.mainSkills.map((m) => m.name)).toEqual([
            'Attack',
            'Magic',
        ]);
        expect(result.current.total).toBe(2);
    });

    it('the create dialog opens and closes', () => {
        const { result } = renderHook(() => useMainSkillsList('c', initial));

        act(() => result.current.createDialog.setOpen(true));
        expect(result.current.createDialog.open).toBe(true);
    });

    it('removes a branch only after the user confirms', async () => {
        const { result } = renderHook(() => useMainSkillsList('c', initial));

        h.confirm.mockResolvedValue(false);
        await act(() => result.current.actions.remove('a'));
        expect(h.mutateOk).not.toHaveBeenCalled();

        h.confirm.mockResolvedValue(true);
        await act(() => result.current.actions.remove('a'));
        expect(h.mutateOk).toHaveBeenCalledWith('a');
        expect(h.confirm).toHaveBeenLastCalledWith(
            expect.objectContaining({ destructive: true })
        );
    });
});
