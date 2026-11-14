// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/systems/skilltrees/ui/content/skills/SkillsList', () => ({
    SkillsList: () => <p>skills-list</p>,
}));
vi.mock('@/systems/skilltrees/ui/content/skills/EditSkill', () => ({
    EditSkillClient: ({ skillId }: { skillId: string }) => (
        <p>{`edit:${skillId}`}</p>
    ),
}));
vi.mock('@/systems/skilltrees/ui/content/skills/form/SkillCreateForm', () => ({
    SkillCreateForm: () => <p>skill-new</p>,
}));

import { SKILLTREES_META } from '@/systems/skilltrees/meta';
import { SKILLTREES_MODULE_UI } from '@/systems/skilltrees/ui';
import { SkillsPage } from '@/systems/skilltrees/ui/content/SkillsPage';

const base = { campaignId: 'c', canEdit: true };

const data = { spells: [], mainSkills: [] };

describe('skilltrees content pages', () => {
    it('SkillsPage dispatches list, new and edit', () => {
        const views = [
            [undefined, 'skills-list'],
            [{ type: 'new' as const }, 'skill-new'],
            [{ type: 'edit' as const, id: 's1' }, 'edit:s1'],
        ] as const;

        for (const [view, text] of views) {
            const r = render(<SkillsPage {...base} view={view} data={data} />);

            expect(screen.getByText(text)).toBeTruthy();
            r.unmount();
        }
    });

    it('declares a page for each of its dm sections', () => {
        const pages = SKILLTREES_MODULE_UI({} as never).dmPages ?? {};

        for (const section of SKILLTREES_META.dmSections)
            expect(pages).toHaveProperty(section);
    });
});
