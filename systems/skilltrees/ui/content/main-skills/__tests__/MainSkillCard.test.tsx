// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MainSkillCard } from '@/systems/skilltrees/ui/content/main-skills/MainSkillCard';
import type { MainSkill } from '@/types/main-skills';

vi.mock('next/link', () => ({
    default: ({
        children,
        href,
        ...rest
    }: {
        children?: React.ReactNode;
        href: string;
    }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

vi.mock('@/components/common/ActionsMenu', () => ({
    ActionsMenu: ({
        actions,
    }: {
        actions: Array<{ label: string; onSelect?: () => void; href?: string }>;
    }) => (
        <div>
            {actions.map((a) => (
                <button
                    key={a.label}
                    data-href={a.href}
                    onClick={a.onSelect}
                    type="button"
                >
                    {a.label}
                </button>
            ))}
        </div>
    ),
}));

vi.mock('@/components/common/ZoomableEntityIcon', () => ({
    ZoomableEntityIcon: ({ src, name }: { src: string; name: string }) => (
        <span data-testid="icon" data-src={src}>
            {name}
        </span>
    ),
}));

const skill = (over: Partial<MainSkill> = {}): MainSkill => ({
    id: 'ms1',
    campaignId: 'c1',
    name: 'Warrior',
    color: '#ff0000',
    createdAt: '',
    updatedAt: '',
    ...over,
});

describe('MainSkillCard', () => {
    afterEach(cleanup);

    it('renders name, id and color', () => {
        render(
            <MainSkillCard
                mainSkill={skill()}
                campaignId="c1"
                onDelete={vi.fn()}
            />
        );

        expect(screen.getAllByText('Warrior').length).toBeGreaterThan(0);
        expect(
            screen.getByText('skills.mainSkills.card.id {"id":"ms1"}')
        ).toBeInTheDocument();
        expect(screen.getByText('#ff0000')).toBeInTheDocument();
    });

    it('shows the icon only when the skill has one', () => {
        const { rerender } = render(
            <MainSkillCard
                mainSkill={skill()}
                campaignId="c1"
                onDelete={vi.fn()}
            />
        );

        expect(screen.queryByTestId('icon')).not.toBeInTheDocument();

        rerender(
            <MainSkillCard
                mainSkill={skill({ icon: 'https://x/i.png' })}
                campaignId="c1"
                onDelete={vi.fn()}
            />
        );

        expect(screen.getByTestId('icon').dataset.src).toBe('https://x/i.png');
    });

    it('edit action links to the editor page and delete calls onDelete with the id', () => {
        const onDelete = vi.fn();

        render(
            <MainSkillCard
                mainSkill={skill()}
                campaignId="c9"
                onDelete={onDelete}
            />
        );

        expect(
            screen.getByText('common.actions.edit').dataset.href
        ).toBe('/campaigns/c9/dm/main-skills/ms1');

        fireEvent.click(screen.getByText('common.actions.delete'));

        expect(onDelete).toHaveBeenCalledWith('ms1');
    });
});
