// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    CareerCanonPanel,
    SpeciesCanonPanel,
    StatsCanonPanel,
    TalentsCanonPanel,
} from '../CanonPanels';
import type { WfrpDraftFormState } from '../types';

import { render } from '@/lib/i18n/test/render-uk';

vi.unmock('next-intl');
vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

type Canon = NonNullable<WfrpDraftFormState['canon']>;

const makeCanon = (over: Partial<Canon> = {}): Canon => ({
    step: 5,
    speciesRolled: false,
    setSpeciesRolled: vi.fn(),
    speciesSkills: {
        count: 2,
        options: ['athletics', 'cool'],
        languages: [],
        picked: [],
        toggle: vi.fn(),
    },
    speciesTalents: { groups: [], picked: [], set: vi.fn(), names: (id) => id },
    careerSkills: {
        options: ['athletics', 'cool'],
        counts: {},
        set: vi.fn(),
    },
    careerTalent: { options: ['f0', 'f1'], picked: undefined, set: vi.fn() },
    trappings: ['Rope'],
    distribution: { keys: ['ws', 'int'], values: {}, set: vi.fn(), cap: 6 },
    fateBonus: false,
    ...over,
});

describe('canon creation panels', () => {
    afterEach(cleanup);

    it('species panel toggles the rolled checkbox and a skill pick', () => {
        const canon = makeCanon();

        render(<SpeciesCanonPanel canon={canon} />);
        fireEvent.click(screen.getByRole('switch'));
        expect(canon.setSpeciesRolled).toHaveBeenCalledWith(true);
        fireEvent.click(screen.getAllByRole('radio')[0]);
        expect(canon.speciesSkills.toggle).toHaveBeenCalledWith('athletics', 2);
    });

    it('species panel picks one talent per pair', () => {
        const canon = makeCanon({
            speciesTalents: {
                groups: [['a', 'b']],
                picked: ['a'],
                set: vi.fn(),
                names: (id) => `T-${id}`,
            },
        });

        render(<SpeciesCanonPanel canon={canon} />);
        fireEvent.click(screen.getByRole('radio', { name: 'T-b' }));
        expect(canon.speciesTalents.set).toHaveBeenCalledWith(0, 'b');
    });

    it('career panel steps a skill up to the per-skill cap', () => {
        const canon = makeCanon();

        render(<CareerCanonPanel canon={canon} />);
        fireEvent.click(screen.getAllByRole('button', { name: /Більше/ })[0]);
        expect(canon.careerSkills.set).toHaveBeenCalledWith('athletics', 1);
    });

    it('stats panel shows the Fate bonus and limits the distribution', () => {
        const canon = makeCanon({
            fateBonus: true,
            distribution: {
                keys: ['ws', 'int'],
                values: { ws: 6 },
                set: vi.fn(),
                cap: 6,
            },
        });

        render(<StatsCanonPanel canon={canon} label={(k) => k} />);
        expect(screen.getByRole('status')).toBeInTheDocument();

        const more = screen.getAllByRole('button', { name: /Більше/ });

        expect(more[0]).toBeDisabled();
        expect(more[1]).toBeDisabled();
    });

    it('talents panel picks a career talent and lists the trappings', () => {
        const canon = makeCanon();

        render(<TalentsCanonPanel canon={canon} names={(id) => `n-${id}`} />);
        fireEvent.click(screen.getByText('n-f1'));
        expect(canon.careerTalent.set).toHaveBeenCalledWith('f1');
        expect(screen.getByText('Rope')).toBeInTheDocument();
    });
});
