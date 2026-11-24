// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReactionIcon } from '../ReactionIcon';
import { StrikeReturnIcon } from '../StrikeReturnIcon';

describe.each([
    ['ReactionIcon', ReactionIcon],
    ['StrikeReturnIcon', StrikeReturnIcon],
])('%s', (_name, Icon) => {
    it('renders an aria-hidden svg and accepts className', () => {
        const { container } = render(<Icon className="size-6 custom" />);

        const svg = container.querySelector('svg');

        expect(svg).not.toBeNull();
        expect(svg?.getAttribute('aria-hidden')).toBe('true');
        expect(svg?.getAttribute('class')).toContain('custom');
    });
});
