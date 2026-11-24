// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

import '@/components/systems/registry';
import { HeroCluster } from '@/components/battle/participants/hero/HeroCluster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { render } from '@/lib/i18n/test/render-uk';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';

vi.unmock('next-intl');

afterEach(cleanup);

const setup = (readied: boolean) => {
    const scene = fakeScene({ knownSpells: ['shield'] });

    scene.battle.rules = {
        ...DEFAULT_RULES,
        actions: { ...DEFAULT_RULES.actions, enabled: true },
    };

    const hero = {
        ...scene.me,
        battleData: {
            ...scene.me.battleData,
            readied: readied
                ? { kind: 'attack' as const, round: 3 }
                : undefined,
            pendingCast: readied
                ? { spellName: 'Fireball', remainingRounds: 2 }
                : undefined,
        },
    } as typeof scene.me;

    render(
        <TooltipProvider>
            <HeroCluster hero={hero} />
        </TooltipProvider>,
        { wrapper: scene.wrapper }
    );
};

describe('HeroCluster time-critical controls', () => {
    it('shows readied attack and pending cast without expanding', () => {
        setup(true);
        expect(
            screen.queryByRole('button', { name: /Підготовлена атака/ })
        ).not.toBeNull();
        expect(screen.queryByText(/Fireball/)).not.toBeNull();
    });

    it('hides them when nothing is readied or pending', () => {
        setup(false);
        expect(
            screen.queryByRole('button', { name: /Підготовлена атака/ })
        ).toBeNull();
        expect(screen.queryByText(/Fireball/)).toBeNull();
    });
});
