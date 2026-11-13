// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { MoraleBadge } from '@/systems/morale/ui/battle/MoraleBadge';

describe('MoraleBadge', () => {
    afterEach(cleanup);

    it('shows a non-zero morale on the hero panel only', () => {
        const scene = fakeScene({ morale: 2 });

        const hero = render(
            <MoraleBadge participant={scene.me} place="hero" />,
            { wrapper: scene.wrapper }
        );

        expect(hero.container.textContent).toContain('2');
        hero.unmount();

        const row = render(<MoraleBadge participant={scene.me} place="row" />, {
            wrapper: scene.wrapper,
        });

        expect(row.container.textContent).toBe('');
    });

    it('shows nothing for a zero morale', () => {
        const scene = fakeScene({ morale: 0 });

        const { container } = render(
            <MoraleBadge participant={scene.me} place="hero" />,
            { wrapper: scene.wrapper }
        );

        expect(container.textContent).toBe('');
    });
});
