// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    deleteOne: vi.fn(),
    deleteAll: vi.fn(),
    duplicate: vi.fn(),
}));

const skills = vi.hoisted(() => [
    { id: 's1', name: 'Bash', mainSkillId: 'm1' },
    { id: 's2', name: 'Armor', mainSkillId: 'm1' },
    { id: 's3', name: 'Loose', mainSkillId: null },
]);

const mainSkills = vi.hoisted(() => [
    { id: 'm1', name: 'Attack', color: 'red' },
]);

vi.mock('@/lib/hooks/skills', () => ({
    useSkills: () => ({ data: skills, isLoading: false }),
    useMainSkills: () => ({ data: mainSkills }),
    useDeleteSkill: () => ({ mutateAsync: h.deleteOne }),
    useDeleteAllSkills: () => ({ mutateAsync: h.deleteAll }),
    useDuplicateSkill: () => ({ mutateOk: h.duplicate }),
}));

import { useSkillsList } from '@/systems/skilltrees/hooks/useSkillsList';

describe('useSkillsList', () => {
    beforeEach(() => vi.resetAllMocks());
    afterEach(cleanup);

    it('groups skills by branch, sorted by name, ungrouped last', () => {
        const { result } = renderHook(() => useSkillsList('c'));

        expect(result.current.groups).toHaveLength(2);
        expect(result.current.groups[0]).toMatchObject({
            name: 'Attack',
            color: 'red',
        });
        expect(result.current.groups[0].skills.map((s) => s.name)).toEqual([
            'Armor',
            'Bash',
        ]);
        expect(result.current.groups[1].skills.map((s) => s.name)).toEqual([
            'Loose',
        ]);
        expect(result.current.groups[1].color).toBeUndefined();
    });

    it('search matches the branch name as well as the skill name', () => {
        vi.useFakeTimers();

        try {
            const { result } = renderHook(() => useSkillsList('c'));

            act(() => result.current.search.query.set('attack'));
            act(() => void vi.advanceTimersByTime(300));
            expect(result.current.groups.map((g) => g.name)).toEqual([
                'Attack',
            ]);
            expect(result.current.groups[0].skills).toHaveLength(2);

            act(() => result.current.search.query.set('loose'));
            act(() => void vi.advanceTimersByTime(300));
            expect(
                result.current.groups.flatMap((g) => g.skills.map((x) => x.id))
            ).toEqual(['s3']);
        } finally {
            vi.useRealTimers();
        }
    });

    it('actions delegate to the mutations', async () => {
        const { result } = renderHook(() => useSkillsList('c'));

        await result.current.actions.deleteSkill('s1');
        result.current.actions.duplicateSkill('s2');
        await result.current.actions.removeAll();

        expect(h.deleteOne).toHaveBeenCalledWith('s1');
        expect(h.duplicate).toHaveBeenCalledWith('s2');
        expect(h.deleteAll).toHaveBeenCalledTimes(1);
    });
});
