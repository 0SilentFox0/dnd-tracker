// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConditionTestPanel } from '../ConditionTestPanel';

import type { ConditionTestPanelProps } from '@/components/systems/types';
import { render } from '@/lib/i18n/test/render-uk';
import {
    type ConditionTestPanel as Panel,
    useConditionTestPanel,
} from '@/systems/wfrp/hooks/useConditionTestPanel';

vi.unmock('next-intl');
vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));
vi.mock('@/systems/wfrp/hooks/useConditionTestPanel', () => ({
    useConditionTestPanel: vi.fn(),
}));

const hero = {} as unknown as ConditionTestPanelProps['hero'];

const panel = (over: Partial<Panel> = {}): Panel => ({
    items: [
        { key: 'prone', label: 'Збитий', stand: true },
        { key: 'stunned', label: 'Приголомшений', stand: false },
    ],
    attempt: vi.fn(),
    isPending: false,
    ...over,
});

describe('ConditionTestPanel', () => {
    beforeEach(() => vi.mocked(useConditionTestPanel).mockReset());
    afterEach(cleanup);

    it('renders nothing without a panel', () => {
        vi.mocked(useConditionTestPanel).mockReturnValue(null);

        const { container } = render(<ConditionTestPanel hero={hero} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('a stand condition is attempted immediately without a roll', () => {
        const p = panel();

        vi.mocked(useConditionTestPanel).mockReturnValue(p);
        render(<ConditionTestPanel hero={hero} />);
        fireEvent.click(screen.getByRole('button', { name: 'Встати' }));
        expect(p.attempt).toHaveBeenCalledWith('prone', undefined);
    });

    it('other conditions expand a roll source; auto attempts without a roll', () => {
        const p = panel();

        vi.mocked(useConditionTestPanel).mockReturnValue(p);
        render(<ConditionTestPanel hero={hero} />);

        const toggle = screen.getByRole('button', {
            name: 'Спробувати зняти: Приголомшений',
        });

        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        fireEvent.click(screen.getByRole('button', { name: 'Авто-кидок' }));
        expect(p.attempt).toHaveBeenCalledWith('stunned', undefined);
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('manual source passes the typed roll', () => {
        const p = panel();

        vi.mocked(useConditionTestPanel).mockReturnValue(p);
        render(<ConditionTestPanel hero={hero} />);
        fireEvent.click(
            screen.getByRole('button', {
                name: 'Спробувати зняти: Приголомшений',
            })
        );
        fireEvent.click(screen.getByRole('button', { name: 'Вручну' }));
        fireEvent.change(screen.getByLabelText('1–100'), {
            target: { value: '64' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Кинути' }));
        expect(p.attempt).toHaveBeenCalledWith('stunned', 64);
    });

    it('clicking the open toggle again collapses it; pending disables every row', () => {
        vi.mocked(useConditionTestPanel).mockReturnValue(panel());

        const { rerender } = render(<ConditionTestPanel hero={hero} />);

        const toggle = screen.getByRole('button', {
            name: 'Спробувати зняти: Приголомшений',
        });

        fireEvent.click(toggle);
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'false');

        vi.mocked(useConditionTestPanel).mockReturnValue(
            panel({ isPending: true })
        );
        rerender(<ConditionTestPanel hero={hero} />);
        expect(screen.getByRole('button', { name: 'Встати' })).toBeDisabled();
        expect(toggle).toBeDisabled();
    });
});
