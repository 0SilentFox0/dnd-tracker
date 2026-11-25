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
import { TooltipProvider } from '@/components/ui/tooltip';
import {
    CombatStatus,
    type CombatStatusType,
    ParticipantSide,
} from '@/lib/constants/battle';
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

const mk = (
    id: string,
    side: ParticipantSide,
    status: CombatStatusType = CombatStatus.ACTIVE
) => {
    const b = createMockParticipant();

    return {
        ...b,
        basicInfo: { ...b.basicInfo, id, name: id, side, controlledBy: 'x' },
        combatStats: {
            ...b.combatStats,
            currentHp: 40,
            maxHp: 50,
            status,
        },
    };
};

function setup(
    opts: {
        selectedId?: string | null;
        mapAim?: unknown;
        enemyStatus?: CombatStatusType;
        isDM?: boolean;
    } = {}
) {
    const select = vi.fn();

    const ally = mk('hero', ParticipantSide.ALLY);

    const enemy = mk('orc', ParticipantSide.ENEMY, opts.enemyStatus);

    const order = [ally, enemy];

    const value = {
        battle: {
            initiativeOrder: order,
            currentTurnIndex: 0,
            currentRound: 1,
            battleLog: [],
            rules: DEFAULT_RULES,
        } as unknown as BattleScene,
        viewer: {
            userId: 'u',
            isDM: opts.isDM ?? false,
            readOnly: false,
            canSeeEnemyHp: false,
        },
        effects: buildDisplayEffects(order),
        roster: { hero: ally },
        selectedId: opts.selectedId === undefined ? 'orc' : opts.selectedId,
        select,
        intents: { mapAim: opts.mapAim ?? null, mapPick: null },
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

describe('TokenBubble', () => {
    it('stays closed while a map aim is active despite selectedId', () => {
        const { Wrapper } = setup({ mapAim: { kind: 'attack' } });

        render(<TokenBubble />, { wrapper: Wrapper });

        expect(screen.queryByRole('dialog')).toBeNull();

        expect(document.querySelector('[data-token-bubble]')).toBeNull();
    });

    it('Escape clears the selection', () => {
        const { Wrapper, select } = setup();

        render(<TokenBubble />, { wrapper: Wrapper });

        fireEvent.keyDown(document.body, { key: 'Escape' });

        expect(select).toHaveBeenCalledWith(null);
    });

    it('a player never sees exact enemy HP', () => {
        const { Wrapper } = setup();

        render(<TokenBubble />, { wrapper: Wrapper });

        expect(document.body.textContent).not.toMatch(/40\s*\/\s*50/);
    });

    it('a fallen token closes the bubble', () => {
        const { Wrapper, select } = setup({ enemyStatus: CombatStatus.DEAD });

        render(<TokenBubble />, { wrapper: Wrapper });

        expect(screen.queryByRole('dialog')).toBeNull();

        expect(select).toHaveBeenCalledWith(null);
    });
});
