// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { HeroStats } from '@/systems/d20/ui/battle/HeroStats';

afterEach(cleanup);

describe('d20 HeroStats', () => {
    it('compact: a text suffix with the armor class', () => {
        const { wrapper, me } = fakeScene();

        render(<HeroStats hero={me} compact />, { wrapper });
        expect(document.body.textContent).toBe(' · AC 12');
    });

    it('full: the armor class next to a shield', () => {
        const { wrapper, me } = fakeScene();

        render(<HeroStats hero={me} compact={false} />, { wrapper });
        expect(screen.getByText('12')).toBeTruthy();
    });
});
