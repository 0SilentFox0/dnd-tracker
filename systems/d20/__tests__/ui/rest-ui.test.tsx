// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MAX_EXHAUSTION } from '@/lib/constants/exhaustion';
import { ResourceFields } from '@/systems/d20/ui/rest/ResourceFields';
import { RestBadges } from '@/systems/d20/ui/rest/RestBadges';
import type { CharacterSheet } from '@/types/characters';

describe('d20 ResourceFields', () => {
    afterEach(cleanup);

    it('renders current values, empty when unset', () => {
        render(<ResourceFields values={{ tempHp: '5' }} onChange={vi.fn()} />);

        expect(document.getElementById('res-temp')).toHaveValue(5);
        expect(document.getElementById('res-exh')).toHaveValue(null);
        expect(document.getElementById('res-exh')).toHaveAttribute(
            'max',
            String(MAX_EXHAUSTION)
        );
    });

    it('reports edits by field key with the raw string', () => {
        const onChange = vi.fn();

        render(<ResourceFields values={{}} onChange={onChange} />);

        fireEvent.change(document.getElementById('res-temp') as HTMLElement, {
            target: { value: '7' },
        });
        fireEvent.change(document.getElementById('res-exh') as HTMLElement, {
            target: { value: '2' },
        });

        expect(onChange).toHaveBeenNthCalledWith(1, 'tempHp', '7');
        expect(onChange).toHaveBeenNthCalledWith(2, 'exhaustion', '2');
    });
});

describe('d20 RestBadges', () => {
    afterEach(cleanup);

    const sheet = (rest: unknown) => ({ rest }) as unknown as CharacterSheet;

    it('renders nothing without rest data', () => {
        const { container } = render(<RestBadges sheet={sheet(undefined)} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('hides exhaustion at 0 and inspiration when false', () => {
        const { container } = render(
            <RestBadges sheet={sheet({ exhaustion: 0, inspiration: false })} />
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('shows the exhaustion level and inspiration', () => {
        render(
            <RestBadges sheet={sheet({ exhaustion: 3, inspiration: true })} />
        );

        expect(
            screen.getByText(/rest\.badges\.exhaustion.*"level":3/)
        ).toBeInTheDocument();
        expect(screen.getByText('rest.badges.inspiration')).toBeInTheDocument();
    });
});
