// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import * as game from '../game';
import { actionIcon } from '../index';
import { ReactionIcon } from '../ReactionIcon';
import { StrikeReturnIcon } from '../StrikeReturnIcon';

describe.each([
    ['ReactionIcon', ReactionIcon],
    ['StrikeReturnIcon', StrikeReturnIcon],
    ...Object.entries(game),
])('%s', (_name, Icon) => {
    it('renders an aria-hidden svg and accepts className', () => {
        const { container } = render(<Icon className="size-6 custom" />);

        const svg = container.querySelector('svg');

        expect(svg).not.toBeNull();
        expect(svg?.getAttribute('aria-hidden')).toBe('true');
        expect(svg?.getAttribute('class')).toContain('custom');
    });
});

describe('game icons', () => {
    it.each(Object.entries(game))('%s is a filled 512 glyph without background', (_name, Icon) => {
        const { container } = render(<Icon />);

        const svg = container.querySelector('svg');

        expect(svg?.getAttribute('viewBox')).toBe('0 0 512 512');
        expect(svg?.getAttribute('fill')).toBe('currentColor');
        expect(container.querySelectorAll('path')).toHaveLength(1);
        expect(container.innerHTML).not.toContain('M0 0h512v512H0z');
    });
});

describe('actionIcon map', () => {
    it('uses distinct game icons for the action tiles', () => {
        const keys = ['magic', 'channel', 'ability', 'bonus', 'reaction', 'core', 'gear', 'strikeAndReturn', 'endTurn', 'nextTurn', 'gate'] as const;

        const used = keys.map((k) => actionIcon[k]);

        expect(new Set(used).size).toBe(keys.length);
        expect(used.every((c) => Object.values(game).includes(c as never))).toBe(true);
    });
});
