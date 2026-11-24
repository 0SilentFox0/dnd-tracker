// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProfileProvider } from '@/components/character-profile/ProfileContext';
import { mockMatchMedia } from '@/components/ui/__tests__/match-media';
import { StatsTab } from '@/systems/d20/ui/StatsTab';
import type { CharacterSheet } from '@/types/characters';

const sheet = {
    abilities: [
        { key: 'strength', score: 16, mod: 3, isPrimary: true },
        { key: 'dexterity', score: 8, mod: -1, isPrimary: false },
    ],
    primaryAbility: 'strength',
    saves: [
        {
            key: 'strength',
            ability: 'strength',
            proficient: true,
            expertise: false,
            bonus: 5,
        },
        {
            key: 'dexterity',
            ability: 'dexterity',
            proficient: true,
            expertise: true,
            bonus: 1,
        },
        {
            key: 'wisdom',
            ability: 'wisdom',
            proficient: false,
            expertise: false,
            bonus: 0,
        },
    ],
    skills: [
        { key: 'athletics', proficient: true, bonus: 5 },
        { key: 'stealth', proficient: false, bonus: -1 },
    ],
    passives: { perception: 11, investigation: 9, insight: 10 },
    languages: [],
    proficiencies: [],
} as unknown as CharacterSheet;

const renderTab = (
    props: Partial<React.ComponentProps<typeof StatsTab>> = {},
    s: CharacterSheet = sheet
) => {
    const onRoll = vi.fn();

    render(
        <ProfileProvider
            campaignId="c"
            characterId="h"
            sheet={s}
            canEdit={false}
        >
            <StatsTab section="bottom" canRoll onRoll={onRoll} {...props} />
        </ProfileProvider>
    );

    return onRoll;
};

describe('d20 StatsTab', () => {
    beforeEach(() => mockMatchMedia(false));
    afterEach(cleanup);

    it('top section shows scores, signed modifiers and primary marker', () => {
        renderTab({ section: 'top' });

        expect(document.body.textContent).toContain('"n":16');
        expect(screen.getByText('+3')).toBeInTheDocument();
        expect(document.body.textContent).toContain('"n":8');
        expect(
            screen.getByText('characterProfile.combat.primary')
        ).toBeInTheDocument();
        expect(screen.queryByText(/saves/)).toBeNull();
    });

    it('top section shows the matching save with a proficiency diamond', () => {
        renderTab({ section: 'top' });

        const save = screen
            .getAllByText('characterProfile.combat.saveShort')[0]
            .closest('button');

        expect(save?.querySelector('i.bg-hud-gold')).not.toBeNull();
        expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('bottom section marks proficiency and expertise', () => {
        renderTab();

        const items = screen.getAllByRole('listitem');

        expect(items).toHaveLength(2);
        expect(items[0].querySelectorAll('i.bg-hud-gold')).toHaveLength(1);
        expect(items[1].querySelectorAll('i.bg-hud-gold')).toHaveLength(0);
        expect(document.body.textContent).toContain(
            'characterProfile.combat.passives'
        );
        expect(document.body.textContent).toContain('11');
    });

    it('bottom section shows three passive chips', () => {
        renderTab();

        for (const v of ['11', '9', '10'])
            expect(screen.getByText(v).tagName).toBe('DD');
    });

    it('top section tints proficient save bonuses gold', () => {
        renderTab({ section: 'top' });

        expect(screen.getByText('+5')).toHaveClass('text-hud-gold');
        expect(screen.getByText('+1')).toHaveClass('text-hud-gold');
    });

    it('rolls a save from the ability tile', () => {
        const onRoll = renderTab({ section: 'top' });

        fireEvent.click(screen.getAllByRole('button')[1]);

        expect(onRoll).toHaveBeenCalledWith(
            expect.objectContaining({
                subject: { kind: 'save', ability: 'strength' },
            })
        );
    });

    it('rolls an ability check from the tile', () => {
        const onRoll = renderTab({ section: 'top' });

        fireEvent.click(screen.getAllByRole('button')[0]);

        expect(onRoll).toHaveBeenCalledWith(
            expect.objectContaining({
                subject: { kind: 'check', ability: 'strength' },
            })
        );
    });

    it('rolls a skill check', () => {
        const onRoll = renderTab();

        const buttons = screen.getAllByRole('button');

        fireEvent.click(buttons[buttons.length - 1]);

        expect(onRoll).toHaveBeenCalledWith(
            expect.objectContaining({
                subject: { kind: 'check', skill: 'stealth' },
            })
        );
    });

    it('renders no roll buttons when rolling is disabled', () => {
        renderTab({ canRoll: false });

        expect(screen.queryAllByRole('button')).toHaveLength(0);
    });

    it('lists languages and proficiencies only when present', () => {
        const { unmount } = (() => {
            renderTab();

            return { unmount: cleanup };
        })();

        expect(document.body.textContent).not.toContain('languages');
        unmount();

        renderTab({}, {
            ...sheet,
            languages: ['Common', 'Elvish'],
            proficiencies: ['Lute'],
        } as never);

        expect(document.body.textContent).toContain('Common, Elvish');
        expect(document.body.textContent).toContain('Lute');
    });
});

describe('d20 StatsTab accessibility', () => {
    beforeEach(() => mockMatchMedia(false));
    afterEach(cleanup);

    it('spells out proficiency and expertise for screen readers', () => {
        renderTab({}, {
            ...sheet,
            skills: [
                { key: 'athletics', proficient: true, bonus: 5 },
                {
                    key: 'stealth',
                    proficient: true,
                    expertise: true,
                    bonus: 9,
                },
                { key: 'arcana', proficient: false, bonus: 0 },
            ],
        } as never);

        const items = screen.getAllByRole('listitem');

        expect(items[0]).toHaveTextContent(
            'characterProfile.combat.proficient'
        );
        expect(items[1]).toHaveTextContent('characterProfile.combat.expertise');
        expect(items[2]).not.toHaveTextContent(
            'characterProfile.combat.proficient'
        );
    });
});
