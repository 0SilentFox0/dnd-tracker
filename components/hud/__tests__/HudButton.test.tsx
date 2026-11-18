// @vitest-environment happy-dom
import { createRef } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { HudButton } from '@/components/hud';

describe('HudButton', () => {
    afterEach(cleanup);

    it('defaults to type="button" and allows submit override', () => {
        render(
            <>
                <HudButton>a</HudButton>
                <HudButton type="submit">b</HudButton>
            </>
        );

        expect(screen.getByText('a').getAttribute('type')).toBe('button');
        expect(screen.getByText('b').getAttribute('type')).toBe('submit');
    });

    it('forwards the ref to the button', () => {
        const ref = createRef<HTMLButtonElement>();

        render(<HudButton ref={ref}>a</HudButton>);

        expect(ref.current).toBe(screen.getByText('a'));
    });
});
