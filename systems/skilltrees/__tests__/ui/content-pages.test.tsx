// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/systems/skilltrees/ui/content/skills/SkillsList', () => ({
    SkillsList: (p: { campaignId: string; canEdit: boolean }) => (
        <p>{`skills-list:${p.campaignId}:${p.canEdit}`}</p>
    ),
}));
vi.mock('@/systems/skilltrees/ui/content/skills/EditSkill', () => ({
    EditSkillClient: (p: {
        skillId: string;
        spells: { name: string }[];
        initialMainSkills: { name: string }[];
    }) => (
        <p>{`edit:${p.skillId}:${p.spells[0]?.name}:${p.initialMainSkills[0]?.name}`}</p>
    ),
}));
vi.mock('@/systems/skilltrees/ui/content/skills/form/SkillCreateForm', () => ({
    SkillCreateForm: (p: { spells: { name: string }[] }) => (
        <p>{`skill-new:${p.spells[0]?.name}`}</p>
    ),
}));
vi.mock('@/systems/skilltrees/ui/content/main-skills/MainSkillsList', () => ({
    MainSkillsList: (p: { initialMainSkills: { name: string }[] }) => (
        <p>{`ms-list:${p.initialMainSkills.map((m) => m.name).join(',')}`}</p>
    ),
}));
vi.mock(
    '@/systems/skilltrees/ui/content/main-skills/MainSkillEditForm',
    () => ({
        MainSkillEditForm: (p: { mainSkill: { name: string } }) => (
            <p>{`ms-edit:${p.mainSkill.name}`}</p>
        ),
    })
);
vi.mock(
    '@/systems/skilltrees/ui/content/skill-tree/SkillTreesList',
    () => ({
        SkillTreesList: (p: { canEdit: boolean }) => (
            <p>{`trees:${p.canEdit}`}</p>
        ),
    })
);

import type { DmPageProps } from '@/components/systems/types';
import { SKILLTREES_META } from '@/systems/skilltrees/meta';
import { SKILLTREES_MODULE_UI } from '@/systems/skilltrees/ui';

const pages = SKILLTREES_MODULE_UI({} as never).dmPages ?? {};

const renderPage = (section: string, props: Partial<DmPageProps>) => {
    const Page = pages[section];

    return render(
        <Page campaignId="c" canEdit={true} data={undefined} {...props} />
    );
};

const formData = {
    spells: [{ id: 'sp', name: 'Fireball' }],
    mainSkills: [{ id: 'm', name: 'Attack' }],
};

describe('skilltrees content pages', () => {
    afterEach(cleanup);

    it('skills section shows the list by default with the edit permission', () => {
        renderPage('skills', { data: formData, canEdit: false });

        expect(screen.getByText('skills-list:c:false')).toBeTruthy();
    });

    it('skills new view hands the spell options to the create form', () => {
        renderPage('skills', { view: { type: 'new' }, data: formData });

        expect(screen.getByText('skill-new:Fireball')).toBeTruthy();
    });

    it('skills edit view passes the skill id, spells and branches', () => {
        renderPage('skills', {
            view: { type: 'edit', id: 's1' },
            data: formData,
        });

        expect(screen.getByText('edit:s1:Fireball:Attack')).toBeTruthy();
    });

    it('main skills section lists branches and edits the loaded one', () => {
        renderPage('main-skills', { data: [{ name: 'Attack' }, { name: 'Magic' }] });
        expect(screen.getByText('ms-list:Attack,Magic')).toBeTruthy();
        cleanup();

        renderPage('main-skills', {
            view: { type: 'edit', id: 'm' },
            data: { name: 'Magic' },
        });
        expect(screen.getByText('ms-edit:Magic')).toBeTruthy();
    });

    it('skill trees section forwards the edit permission', () => {
        renderPage('skill-trees', { canEdit: true });

        expect(screen.getByText('trees:true')).toBeTruthy();
    });

    it('declares a page for each of its dm sections', () => {
        for (const section of SKILLTREES_META.dmSections)
            expect(pages).toHaveProperty(section);
    });
});
