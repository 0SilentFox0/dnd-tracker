// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { HeroHp } from '@/components/campaigns/dashboard/HeroHp';

afterEach(cleanup);

describe('HeroHp', () => {
    it('exposes the value as an accessible meter', () => {
        render(<HeroHp hp={{ current: 12, max: 30, temp: 0 }} />);

        const meter = screen.getByRole('meter');

        expect(meter.getAttribute('aria-valuenow')).toBe('12');
        expect(meter.getAttribute('aria-valuemax')).toBe('30');
        expect(meter.getAttribute('aria-valuetext')).toBe('12/30');
    });

    it('colors the bar by hp percent', () => {
        const { container } = render(
            <HeroHp hp={{ current: 5, max: 30, temp: 0 }} />
        );

        expect(
            container
                .querySelector('[data-hp-tone]')
                ?.getAttribute('data-hp-tone')
        ).toBe('low');
    });
});
