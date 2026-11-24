// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<typeof import('@/lib/hooks/common')>()),
    useMediaQuery: () => true,
    useIsMobile: () => false,
}));

import { TokenBubble } from '../TokenBubble';

import '@/components/systems/registry';
import { BattleDrawer } from '@/components/battle/scene/drawers/BattleDrawer';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CombatStatus, ParticipantSide } from '@/lib/constants/battle';
import {
    BattleSceneContext,
    BattleSceneDataContext,
} from '@/lib/hooks/battle';
import type { BattleSceneValue } from '@/lib/hooks/battle/types';
import { render } from '@/lib/i18n/test/render-uk';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { buildDisplayEffects } from '@/lib/utils/battle/view';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { BattleScene } from '@/types/api';

vi.unmock('next-intl');

const mk = (id: string, side: ParticipantSide) => {
    const b = createMockParticipant();

    return {
        ...b,
        basicInfo: { ...b.basicInfo, id, name: id, side, controlledBy: 'x' },
        combatStats: {
            ...b.combatStats,
            currentHp: 40,
            maxHp: 50,
            status: CombatStatus.ACTIVE,
        },
    };
};

function setup(intents: Record<string, unknown> = {}) {
    const select = vi.fn();

    const ally = mk('hero', ParticipantSide.ALLY);

    const order = [ally, mk('orc', ParticipantSide.ENEMY)];

    const value = {
        battle: {
            initiativeOrder: order,
            currentTurnIndex: 0,
            currentRound: 1,
            battleLog: [],
            rules: DEFAULT_RULES,
        } as unknown as BattleScene,
        viewer: { userId: 'u', isDM: false, readOnly: false },
        effects: buildDisplayEffects(order),
        roster: { hero: ally },
        selectedId: 'orc',
        select,
        intents: { mapAim: null, mapPick: null, ...intents },
    } as unknown as BattleSceneValue;

    const Wrapper = ({ children }: { children: ReactNode }) => (
        <TooltipProvider>
            <BattleSceneContext.Provider value={value}>
                <BattleSceneDataContext.Provider value={value}>
                    {children}
                </BattleSceneDataContext.Provider>
            </BattleSceneContext.Provider>
        </TooltipProvider>
    );

    return { select, Wrapper };
}

afterEach(cleanup);

describe('TokenBubble escape and tools', () => {
    it('Escape on the document clears the selection', () => {
        const { Wrapper, select } = setup();

        render(<TokenBubble />, { wrapper: Wrapper });

        fireEvent.keyDown(document.body, { key: 'Escape' });

        expect(select).toHaveBeenCalledWith(null);
    });

    it('Escape closes an open floating panel from anywhere', () => {
        const onOpenChange = vi.fn();

        render(
            <BattleDrawer
                drawer="tools"
                open
                onOpenChange={onOpenChange}
                title="Інструменти"
            >
                <p>body</p>
            </BattleDrawer>
        );

        fireEvent.keyDown(document.body, { key: 'Escape' });

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('a selected token opens the bubble while Tools is open', () => {
        const { Wrapper } = setup();

        render(
            <>
                <BattleDrawer
                    drawer="tools"
                    open
                    onOpenChange={vi.fn()}
                    title="Інструменти"
                >
                    <p>tools body</p>
                </BattleDrawer>
                <TokenBubble />
            </>,
            { wrapper: Wrapper }
        );

        expect(screen.getByText('tools body')).toBeTruthy();
        expect(
            screen.queryByRole('dialog') ||
                document.querySelector('[data-token-bubble]')
        ).toBeTruthy();
    });

    it.each(['mapAim', 'mapPick'])(
        'an active %s intent keeps the bubble closed',
        (key) => {
            const { Wrapper } = setup({ [key]: { kind: 'attack' } });

            render(<TokenBubble />, { wrapper: Wrapper });

            expect(screen.queryByRole('dialog')).toBeNull();
            expect(document.querySelector('[data-token-bubble]')).toBeNull();
        }
    );
});
