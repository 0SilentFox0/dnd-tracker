// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
    BlankTome,
    BrokenD20,
    LanternSearch,
    SheathedSwords,
} from '@/components/common/illustrations';

describe('illustrations', () => {
    afterEach(cleanup);

    it.each([BrokenD20, BlankTome, LanternSearch, SheathedSwords])(
        'are aria-hidden',
        (Component) => {
            const { container } = render(<Component />);

            const svg = container.querySelector('svg');

            expect(svg?.getAttribute('aria-hidden')).toBe('true');
            expect(svg?.getAttribute('viewBox')).toBe('0 0 160 120');
        }
    );

    it('BrokenD20 shows a 1', () => {
        const { container } = render(<BrokenD20 />);

        expect(container.querySelector('text')?.textContent).toBe('1');
    });
});
