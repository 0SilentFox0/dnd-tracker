// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BattleCard } from '@/components/battle/list/BattleCard';
import { BalanceSummary } from '@/components/battle/setup/balance/BalanceSummary';
import { XpBalanceSummary } from '@/components/battle/setup/balance/XpBalanceSummary';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';
import { textOf } from '@/lib/i18n/test/text';
import { textRef } from '@/lib/i18n/text-ref';
import type { FairScaling, PartyPower } from '@/lib/utils/battle/balance';
import { computeXpBudget } from '@/lib/utils/battle/balance/xp-budget';

vi.unmock('next-intl');

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

afterEach(cleanup);

const NAMESPACES = [
    'common',
    'validation',
    'battleSetup',
    'battleTerms',
    'gameTerms',
] as const;

const party = { dpr: 14, hp: 60 } as PartyPower;

const scaling = {
    verdict: 'weak',
    base: { dpr: 5, hp: 20 },
    reached: { dpr: 6, hp: 30 },
    fixed: { dpr: 0, hp: 0 },
    hpScale: 1.5,
    dmgScale: 1.25,
    hint: { kind: 'weak', changes: [{ name: 'Orc', delta: 2 }] },
} as unknown as FairScaling;

const battle = {
    id: 'b1',
    name: 'Ambush',
    description: null,
    status: 'prepared' as const,
    currentRound: 3,
    createdAt: '2026-11-20T10:00:00.000Z',
    startedAt: null,
    completedAt: null,
    map: null,
    sides: { ally: { count: 1, faces: [] }, enemy: { count: 2, faces: [] } },
    result: null,
};

describe('battle setup and list on real catalogs', () => {
    it.each([
        ['en', 'Battle balance', 'Too weak: add Orc ×2', 'No map', 'Start'],
        ['uk', 'Баланс бою', 'Слабко: додайте Orc ×2', 'Без мапи', 'Запустити'],
    ] as const)(
        '%s: balance summary and list card without raw keys',
        async (locale, title, hint, noMap, start) => {
            const { container } = await renderWithIntl(
                <QueryClientProvider client={new QueryClient()}>
                    <ConfirmProvider>
                        <BalanceSummary fair={{ party, scaling }} />
                        <BattleCard battle={battle} campaignId="c1" />
                    </ConfirmProvider>
                </QueryClientProvider>,
                { locale, namespaces: NAMESPACES }
            );

            expect(container.textContent).toContain(title);
            expect(container.textContent).toContain(hint);
            expect(container.textContent).toContain(noMap);
            expect(container.textContent).toContain(start);
            expect(container.textContent).not.toMatch(
                /battleSetup\.|battleTerms\./
            );
        }
    );

    it.each([
        ['en', 'Difficulty: Hard', 'Enemy XP 900 × 1.5 = 1350'],
        ['uk', 'Складність: Складна', 'XP ворогів 900 × 1.5 = 1350'],
    ] as const)('%s: XP summary', async (locale, difficulty, xpLine) => {
        const xp = computeXpBudget({
            edition: '2014',
            heroLevels: [3, 3, 3, 3],
            enemies: [{ unitId: 'ogre', quantity: 2, xp: 450 }],
        });

        const { container } = await renderWithIntl(
            <XpBalanceSummary xp={xp} units={[]} />,
            { locale, namespaces: NAMESPACES }
        );

        expect(container.textContent).toContain(difficulty);
        expect(container.textContent).toContain(xpLine);
    });

    it.each([
        ['en', 'Melee 10, ranged 4 → physical DPR = 10'],
        ['uk', 'Ближній бій 10, дальній 4 → фізичний DPR = 10'],
    ] as const)('%s: DPR breakdown line', (locale, line) => {
        expect(
            textOf(
                textRef('battleSetup.dprBreakdown.physical', {
                    melee: '10',
                    ranged: '4',
                    physical: '10',
                }),
                locale
            )
        ).toBe(line);
    });
});
