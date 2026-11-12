// @vitest-environment happy-dom
import { createElement, lazy, Suspense } from 'react';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { render } from '@/lib/i18n/test/render-uk';
import { DEFAULT_RULES } from '@/lib/utils/rules';

vi.unmock('next-intl');

const rules = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock('next/dynamic', () => ({
    default: (loader: () => Promise<React.ComponentType<object>>) => {
        const Lazy = lazy(() => loader().then((c) => ({ default: c })));

        return (props: object) =>
            createElement(
                Suspense,
                { fallback: null },
                createElement(Lazy as React.ComponentType<object>, props)
            );
    },
}));

vi.mock('@/components/battle/wizards/AttackWizard', () => ({
    AttackWizard: () => null,
}));
vi.mock('@/components/battle/use-system-battle-ui', () => ({
    useSystemBattleUi: () =>
        rules.current.tested
            ? {
                  ChannelDialog: () => <div data-testid="channel-dialog" />,
                  ChannelLabel: () => <>Скерування</>,
              }
            : undefined,
}));
vi.mock('@/components/battle/wizards/SpellBook', () => ({
    SpellBook: () => null,
}));
vi.mock('@/components/battle/turn/CoreActionsDialog', () => ({
    CoreActionsDialog: () => null,
}));
vi.mock('@/components/battle/wizards/BonusActionPicker', () => ({
    BonusActionPicker: ({ trigger }: { trigger?: string }) => (
        <div data-testid={`picker-${trigger ?? 'bonus'}`} />
    ),
}));
vi.mock('@/components/battle/wizards/AuraZonePicker', () => ({
    AuraZonePicker: () => null,
}));
vi.mock('@/components/battle/scene/MapStrip', () => ({
    MapStripRow: () => null,
}));
vi.mock('@/components/battle/modes', () => ({ modeUiOf: () => undefined }));
vi.mock('@/lib/utils/battle/attack/attacks-left', () => ({
    canOffHandAttack: () => true,
}));
vi.mock('@/lib/utils/battle/morale/threshold', () => ({
    moraleTriggerRolls: () => ({ rolls: [] }),
}));
vi.mock('@/lib/utils/battle/view', () => ({ usableAbilities: () => [] }));
vi.mock('@/lib/hooks/battle', () => ({
    useBattleRules: () => rules.current,
    useBattleScene: () => ({
        anyPending: false,
        battle: {
            initiativeOrder: [],
            currentRound: 1,
            currentTurnIndex: 0,
            rules: {
                ...DEFAULT_RULES,
                actions: { ...DEFAULT_RULES.actions, enabled: false },
            },
            map: null,
        },
        intents: {
            attack: null,
            clearAttack: vi.fn(),
            mapAim: null,
            mapPick: null,
            setAttackReady: vi.fn(),
        },
    }),
    useBonusSpells: () => ({}),
    useAuraZones: () => null,
    useSpellBook: () => ({ actions: { open: vi.fn() } }),
    useAttackWizard: () => ({ actions: { open: vi.fn() } }),
    useChannelAction: () => ({ view: {}, actions: { open: vi.fn() } }),
    usePlayerTurn: () => ({
        phase: 'acting',
        status: {
            actionUsed: false,
            attackLeft: true,
            bonusAvailable: true,
            skipped: false,
        },
        strikeAndReturn: { available: false, run: vi.fn() },
        actions: { endTurn: vi.fn(), afterAction: vi.fn() },
    }),
}));

import { MyTurnControls } from '@/components/battle/turn/MyTurnControls';
import type { BattleParticipant } from '@/types/battle';

const hero = {
    basicInfo: { id: 'h1' },
    spellcasting: { spellSlots: { 1: { current: 1 } }, knownSpells: ['x'] },
} as unknown as BattleParticipant;

describe('MyTurnControls: gating за прапорцями правил', () => {
    afterEach(cleanup);

    it('wfrp ховає магію, бонусну плитку та бонусний пікер', async () => {
        rules.current = {
            actionEconomy: { bonusAction: false, reaction: false },
            spells: false,
        };
        render(<MyTurnControls hero={hero} />);
        expect(
            screen.getByRole('button', { name: /Атака/ })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /Магія/ })
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /Бонус/ })
        ).not.toBeInTheDocument();
        expect(await screen.findByTestId('picker-action')).toBeInTheDocument();
        expect(screen.queryByTestId('picker-bonus')).not.toBeInTheDocument();
    });

    it('d20 показує магію, бонусну плитку та бонусний пікер', async () => {
        rules.current = {
            actionEconomy: { bonusAction: true, reaction: true },
            spells: true,
        };
        render(<MyTurnControls hero={hero} />);
        expect(
            screen.getByRole('button', { name: /Магія/ })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Бонус/ })
        ).toBeInTheDocument();
        expect(await screen.findByTestId('picker-bonus')).toBeInTheDocument();
    });

    it('wfrp показує плитку Скерування, d20 — ні', async () => {
        rules.current = {
            actionEconomy: { bonusAction: false, reaction: false },
            spells: true,
            tested: true,
        };
        render(<MyTurnControls hero={hero} />);
        expect(
            screen.getByRole('button', { name: /Скерування/ })
        ).toBeInTheDocument();
        expect(await screen.findByTestId('channel-dialog')).toBeInTheDocument();
        cleanup();

        rules.current = {
            actionEconomy: { bonusAction: true, reaction: true },
            spells: true,
            tested: false,
        };
        render(<MyTurnControls hero={hero} />);
        expect(
            screen.queryByRole('button', { name: /Скерування/ })
        ).not.toBeInTheDocument();
        expect(screen.queryByTestId('channel-dialog')).not.toBeInTheDocument();
    });

    it('hides the Channel tile for a wfrp hero without spells', () => {
        rules.current = {
            actionEconomy: { bonusAction: false, reaction: false },
            spells: true,
            tested: true,
        };

        const mundane = {
            basicInfo: { id: 'h2' },
            spellcasting: { spellSlots: {}, knownSpells: [] },
        } as unknown as BattleParticipant;

        render(<MyTurnControls hero={mundane} />);
        expect(
            screen.queryByRole('button', { name: /Скерування/ })
        ).not.toBeInTheDocument();
    });

    it('hides the Channel tile for a wfrp unit that only has universal slots', () => {
        rules.current = {
            actionEconomy: { bonusAction: false, reaction: false },
            spells: true,
            tested: true,
        };

        const unit = {
            basicInfo: { id: 'u1' },
            spellcasting: {
                spellSlots: { universal: { current: 3 } },
                knownSpells: [],
            },
        } as unknown as BattleParticipant;

        render(<MyTurnControls hero={unit} />);
        expect(
            screen.queryByRole('button', { name: /Скерування/ })
        ).not.toBeInTheDocument();
    });
});
