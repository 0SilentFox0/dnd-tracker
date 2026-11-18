// @vitest-environment happy-dom
import type { FormEvent } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    mutateAsync: vi.fn(),
    navigate: vi.fn(),
    push: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: h.push }) }));
vi.mock('@/lib/hooks/common', () => ({ useNavigateFresh: () => h.navigate }));
vi.mock('@/lib/hooks/skills', () => ({
    useUpdateMainSkill: () => ({
        mutateAsync: h.mutateAsync,
        isPending: false,
    }),
}));
vi.mock('@/lib/hooks/spells', () => ({
    useSpellGroups: () => ({ data: [{ id: 'g', name: 'Fire' }] }),
}));

import { useMainSkillForm } from '@/systems/skilltrees/hooks/useMainSkillForm';
import type { MainSkill } from '@/types/main-skills';

const mainSkill = {
    id: 'm1',
    name: 'Attack',
    color: 'red',
    icon: null,
    isEnableInSkillTree: undefined,
    spellGroupId: undefined,
    role: undefined,
} as unknown as MainSkill;

const submitEvent = { preventDefault: vi.fn() } as unknown as FormEvent;

describe('useMainSkillForm', () => {
    beforeEach(() => vi.resetAllMocks());
    afterEach(cleanup);

    it('starts from the stored branch with form defaults for missing values', () => {
        const { result } = renderHook(() => useMainSkillForm('c', mainSkill));

        expect(result.current.form.data).toEqual({
            name: 'Attack',
            color: 'red',
            icon: '',
            isEnableInSkillTree: false,
            spellGroupId: null,
            role: null,
        });
        expect(result.current.spellGroups).toEqual([{ id: 'g', name: 'Fire' }]);
    });

    it('set merges a patch into the form', () => {
        const { result } = renderHook(() => useMainSkillForm('c', mainSkill));

        act(() => result.current.form.set({ color: 'blue' }));

        expect(result.current.form.data).toMatchObject({
            name: 'Attack',
            color: 'blue',
        });
    });

    it('a blank name is rejected without saving', async () => {
        const { result } = renderHook(() => useMainSkillForm('c', mainSkill));

        act(() => result.current.form.set({ name: '   ' }));
        await act(() => result.current.actions.submit(submitEvent));

        expect(result.current.status.error).toBe('common.form.nameRequired');
        expect(h.mutateAsync).not.toHaveBeenCalled();
        expect(h.navigate).not.toHaveBeenCalled();
    });

    it('saves the trimmed values and returns to the list', async () => {
        h.mutateAsync.mockResolvedValue({});

        const { result } = renderHook(() => useMainSkillForm('c', mainSkill));

        act(() => result.current.form.set({ name: '  Magic ', icon: '  ' }));
        await act(() => result.current.actions.submit(submitEvent));

        expect(h.mutateAsync).toHaveBeenCalledWith({
            mainSkillId: 'm1',
            data: expect.objectContaining({ name: 'Magic', icon: undefined }),
        });
        expect(h.navigate).toHaveBeenCalledWith('/campaigns/c/dm/main-skills');
        expect(result.current.status.error).toBeNull();
    });

    it('a failed save shows the error and stays on the form', async () => {
        h.mutateAsync.mockRejectedValue(new Error('boom'));

        const { result } = renderHook(() => useMainSkillForm('c', mainSkill));

        await act(() => result.current.actions.submit(submitEvent));

        expect(result.current.status.error).toBeTruthy();
        expect(h.navigate).not.toHaveBeenCalled();
    });

    it('cancel goes back to the list', () => {
        const { result } = renderHook(() => useMainSkillForm('c', mainSkill));

        result.current.actions.cancel();

        expect(h.push).toHaveBeenCalledWith('/campaigns/c/dm/main-skills');
    });
});
