// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SpellCard } from '@/components/spells/list/SpellCard';
import type { Spell } from '@/types/spells';

const parseDescription = vi.hoisted(() => vi.fn());

vi.mock('@/lib/hooks/spells', async (orig) => {
    const actual = await orig<typeof import('@/lib/hooks/spells')>();

    return {
        ...actual,
        useSpellDescriptionDoc: (text: string) => {
            parseDescription(text);

            return actual.useSpellDescriptionDoc(text);
        },
    };
});

vi.mock('@/components/common/entity/OptimizedImage', () => ({
    OptimizedImage: () => null,
}));

afterEach(cleanup);

const spell = {
    id: 's1',
    name: 'Іскра',
    level: 1,
    type: 'target',
    damageType: 'damage',
    spellGroup: { id: 'g1', name: 'Вогонь' },
} as unknown as Spell;

describe('SpellCard icon buttons', () => {
    it('мають aria-label, а не лише title', () => {
        render(
            <SpellCard
                spell={spell}
                campaignId="c1"
                spellGroups={[]}
                actions={{
                    onRemoveFromGroup: vi.fn(),
                    onMoveToGroup: vi.fn(),
                }}
            />
        );

        fireEvent.click(screen.getByLabelText('spells.card.expand'));

        for (const label of [
            'spells.card.removeFromGroup',
            'spells.card.moveToGroup',
            'spells.card.copyId',
        ]) {
            const button = screen.getByTitle(label);

            expect(button).toHaveAttribute('aria-label', label);
        }
    });
});

describe('SpellCard description', () => {
    const imported = {
        ...spell,
        description:
            'Level 1 Evocation · Casting Time: Action · Range: 60 feet · Components: V, S · Duration: Instantaneous · Classes: Wizard\n\nA spark leaps.\n\n**_Sensory Effect._** Crackling.',
    } as unknown as Spell;

    it('is collapsed by default and renders markdown without the header when expanded', () => {
        render(<SpellCard spell={imported} campaignId="c1" spellGroups={[]} />);

        expect(screen.queryByText(/A spark leaps/)).toBeNull();

        const toggle = screen.getByLabelText('spells.card.expand');

        expect(toggle).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(toggle);

        expect(screen.getByText(/A spark leaps/)).toBeInTheDocument();
        expect(document.body.textContent).not.toContain('Casting Time');
        expect(document.body.textContent).not.toContain('**');
        expect(
            screen.getByText('Sensory Effect.').closest('strong')
        ).not.toBeNull();
    });

    it('parses the description only once the card is expanded', () => {
        parseDescription.mockClear();
        render(<SpellCard spell={imported} campaignId="c1" spellGroups={[]} />);
        expect(parseDescription).not.toHaveBeenCalled();

        fireEvent.click(screen.getByLabelText('spells.card.expand'));
        expect(parseDescription).toHaveBeenCalled();
    });
});
