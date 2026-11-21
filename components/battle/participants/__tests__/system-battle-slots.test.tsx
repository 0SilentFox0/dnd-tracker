// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

import '@/components/systems/registry';
import { MyHeroPanel } from '@/components/battle/participants/MyHeroPanel';
import { ParticipantRow } from '@/components/battle/participants/ParticipantRow';
import { systemUiOf } from '@/components/systems';
import { TooltipProvider } from '@/components/ui/tooltip';
import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { render } from '@/lib/i18n/test/render-uk';
import { withDeathSaves } from '@/systems/deathsaves/rules/state';

vi.unmock('next-intl');

afterEach(cleanup);

const view = {
    exact: true,
    acText: null,
    wounds: false,
    current: false,
    masked: false,
};

const renderRow = (system?: string) => {
    const { wrapper, me } = fakeScene({ system });

    const downed = withDeathSaves(me, {
        successes: 1,
        failures: 2,
        stable: false,
    });

    render(
        <TooltipProvider>
            <ParticipantRow
                participant={downed}
                effects={[]}
                view={view}
                impact={null}
                onSelect={() => undefined}
                badges={systemUiOf(system ?? 'dnd5e').battle.badges}
            />
        </TooltipProvider>,
        { wrapper }
    );
};

describe('battle slots in the participant row and hero panel', () => {
    it('ParticipantRow: death save pips come from the d20 badges only', () => {
        renderRow();
        expect(screen.queryByText('Кидки смерті')).not.toBeNull();
        cleanup();

        renderRow('wfrp');
        expect(screen.queryByText('Кидки смерті')).toBeNull();
    });

    it('MyHeroPanel: the slot grid is a d20 hero panel', () => {
        const { wrapper, me } = fakeScene({
            knownSpells: ['shield'],
            slots: { '1': { max: 3, current: 2 } },
        });

        render(<MyHeroPanel hero={me} />, { wrapper });
        expect(screen.getByLabelText('I коло: 2 з 3')).toBeTruthy();
    });
});

describe('compact hero panel', () => {
    it('hides system panels behind a toggle that reveals them', () => {
        const { wrapper, me } = fakeScene({
            knownSpells: ['shield'],
            slots: { '1': { max: 3, current: 2 } },
        });

        render(<MyHeroPanel hero={me} compact />, { wrapper });

        const slots = () => screen.getByLabelText('I коло: 2 з 3');

        const trigger = screen.getByText('Дії системи').closest('button');

        expect(trigger?.getAttribute('aria-expanded')).toBe('false');
        expect(slots().closest('[data-state="closed"]')).not.toBeNull();

        fireEvent.click(trigger as HTMLElement);
        expect(trigger?.getAttribute('aria-expanded')).toBe('true');
        expect(slots().closest('[data-state="closed"]')).toBeNull();
    });
});
