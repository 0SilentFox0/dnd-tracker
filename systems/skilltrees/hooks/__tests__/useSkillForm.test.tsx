// @vitest-environment happy-dom
import type { FormEvent } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    create: vi.fn(),
    update: vi.fn(),
    navigate: vi.fn(),
    push: vi.fn(),
    mainSkillsEnabled: [] as (boolean | undefined)[],
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: h.push }) }));
vi.mock('@/lib/hooks/common', () => ({ useNavigateFresh: () => h.navigate }));
vi.mock('@/lib/hooks/skills', () => ({
    useMainSkills: (_id: string, opts: { enabled?: boolean }) => {
        h.mainSkillsEnabled.push(opts.enabled);

        return { data: [{ id: 'api', name: 'From API' }] };
    },
    useCreateSkill: () => ({ mutateAsync: h.create, isPending: false }),
    useUpdateSkill: () => ({ mutateAsync: h.update, isPending: false }),
}));

import { useSkillForm } from '@/systems/skilltrees/hooks/useSkillForm';
import type { MainSkill } from '@/types/main-skills';
import type { Skill } from '@/types/skills';

const submitEvent = { preventDefault: vi.fn() } as unknown as FormEvent;

const existing = {
    id: 'sk1',
    name: 'Bash',
    description: 'Hits',
    icon: null,
    abilities: [],
    mainSkillId: 'm1',
} as unknown as Skill;

describe('useSkillForm', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        h.mainSkillsEnabled.length = 0;
    });
    afterEach(cleanup);

    it('rejects a blank name without calling the API', async () => {
        const { result } = renderHook(() => useSkillForm('c'));

        act(() => result.current.form.set('name', '   '));
        await act(() => result.current.actions.submit(submitEvent));

        expect(result.current.status.error).toBe('common.form.nameRequired');
        expect(h.create).not.toHaveBeenCalled();
        expect(h.navigate).not.toHaveBeenCalled();
    });

    it('blocks the save while abilities are invalid', async () => {
        const { result } = renderHook(() => useSkillForm('c'));

        act(() => {
            result.current.form.set('name', 'Bash');
            result.current.abilities.setErrors(2);
        });
        await act(() => result.current.actions.submit(submitEvent));

        expect(h.create).not.toHaveBeenCalled();
    });

    it('creates with the grouped trimmed payload and returns to the list', async () => {
        h.create.mockResolvedValue({});

        const { result } = renderHook(() => useSkillForm('c'));

        act(() => {
            result.current.form.set('name', '  Bash ');
            result.current.form.set('mainSkillId', 'm1');
        });
        await act(() => result.current.actions.submit(submitEvent));

        expect(h.create).toHaveBeenCalledWith(
            expect.objectContaining({
                basicInfo: {
                    name: 'Bash',
                    description: undefined,
                    icon: undefined,
                },
                mainSkillData: { mainSkillId: 'm1' },
            })
        );
        expect(h.navigate).toHaveBeenCalledWith('/campaigns/c/dm/skills');
        expect(result.current.status.isEdit).toBe(false);
    });

    it('editing updates by id instead of creating', async () => {
        h.update.mockResolvedValue({});

        const { result } = renderHook(() =>
            useSkillForm('c', { initialData: existing })
        );

        expect(result.current.form.data.name).toBe('Bash');
        expect(result.current.status.isEdit).toBe(true);

        await act(() => result.current.actions.submit(submitEvent));

        expect(h.update).toHaveBeenCalledWith({
            skillId: 'sk1',
            data: expect.objectContaining({
                basicInfo: expect.objectContaining({ name: 'Bash' }),
            }),
        });
        expect(h.create).not.toHaveBeenCalled();
    });

    it('a failed create keeps the user on the form and shows the error message', async () => {
        h.create.mockRejectedValue(new Error('boom'));

        const { result } = renderHook(() => useSkillForm('c'));

        act(() => result.current.form.set('name', 'Bash'));
        await act(() => result.current.actions.submit(submitEvent));

        expect(result.current.status.error).toBe('boom');
        expect(h.navigate).not.toHaveBeenCalled();
    });

    it('a non-Error rejection shows the create fallback text', async () => {
        h.create.mockRejectedValue('nope');

        const { result } = renderHook(() => useSkillForm('c'));

        act(() => result.current.form.set('name', 'Bash'));
        await act(() => result.current.actions.submit(submitEvent));

        expect(result.current.status.error).toBe('common.form.createFailed');
    });

    it('uses the provided main skills and skips the fetch; cancel goes to the list', () => {
        const initialMainSkills = [
            { id: 'm9', name: 'Given' },
        ] as unknown as MainSkill[];

        const { result } = renderHook(() =>
            useSkillForm('c', { initialMainSkills })
        );

        expect(result.current.mainSkills).toBe(initialMainSkills);
        expect(h.mainSkillsEnabled.at(-1)).toBe(false);

        act(() => result.current.actions.cancel());

        expect(h.push).toHaveBeenCalledWith('/campaigns/c/dm/skills');
    });

    it('falls back to the API main skills when none are provided', () => {
        const { result } = renderHook(() => useSkillForm('c'));

        expect(result.current.mainSkills).toEqual([
            { id: 'api', name: 'From API' },
        ]);
        expect(h.mainSkillsEnabled.at(-1)).toBe(true);
    });
});
