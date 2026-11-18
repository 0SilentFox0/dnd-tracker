// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/systems/skilltrees/api/skill-trees', () => ({
    updateSkillTree: vi.fn(async () => ({ id: 't1', race: 'Elf', skills: {} })),
}));

import { skillKeys } from '@/lib/hooks/skills';
import { buildTreeJson } from '@/lib/utils/skills/progression';
import { updateSkillTree } from '@/systems/skilltrees/api/skill-trees';
import { useSaveSkillTree } from '@/systems/skilltrees/hooks/useSaveSkillTree';

afterEach(cleanup);

describe('useSaveSkillTree', () => {
    it('sends the tree with the campaign id and invalidates progression and trees', async () => {
        const client = new QueryClient();

        const invalidate = vi.spyOn(client, 'invalidateQueries');

        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>
                {children}
            </QueryClientProvider>
        );

        const skills = buildTreeJson({ id: 't1', race: 'Elf', branches: [] });

        const { result } = renderHook(() => useSaveSkillTree('c1'), {
            wrapper,
        });

        await act(() =>
            result.current.mutateAsync({ treeId: 't1', race: 'Elf', skills })
        );

        expect(updateSkillTree).toHaveBeenCalledWith({
            campaignId: 'c1',
            treeId: 't1',
            race: 'Elf',
            skills,
        });

        const keys = invalidate.mock.calls.map((c) => c[0]?.queryKey);

        expect(keys).toContainEqual(skillKeys.progressionOf('c1'));
        expect(keys).toContainEqual(skillKeys.trees('c1'));
    });
});
