// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import * as rail from '../rail';

describe.each(Object.entries(rail))('%s', (_name, Icon) => {
    it('is an aria-hidden 24px currentColor svg that accepts className', () => {
        const { container } = render(<Icon className="custom size-6" />);

        const svg = container.querySelector('svg');

        expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
        expect(svg?.getAttribute('aria-hidden')).toBe('true');
        expect(svg?.getAttribute('class')).toContain('custom');
        expect(container.innerHTML).toContain('currentColor');
    });
});
