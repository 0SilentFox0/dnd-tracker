// @vitest-environment happy-dom
import { createElement, lazy, Suspense } from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { render } from '@/lib/i18n/test/render-uk';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';

vi.unmock('next-intl');

const rules = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

const turnState = vi.hoisted(() => ({
    phase: 'acting',
    turnStart: false,
    mapAim: null as object | null,
    mapPick: null as object | null,
}));

const hotkeys = vi.hoisted(() => ({
    enabled: undefined as boolean | undefined,
}));

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
    useSystemBattleUi: () => ({
        ...(rules.current.tested
            ? {
                  ChannelDialog: () => <div data-testid="channel-dialog" />,
                  ChannelLabel: () => <>Скерування</>,
              }
            : {}),
        ...(turnState.turnStart
            ? {
                  turnStart: {
                      Panel: () => <div data-testid="turn-start-panel" />,
                      Label: () => <>Мітка</>,
                  },
              }
            : {}),
    }),
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
vi.mock('@/components/battle/modes', () => ({ modeUiOf: () => undefined }));
vi.mock('@/lib/utils/battle/attack/off-hand', () => ({
    canOffHandAttack: () => true,
}));
vi.mock('@/lib/utils/battle/view', () => ({
    usableAbilities: () => [],
    reactionAvailable: () => true,
}));
vi.mock('@/lib/hooks/battle', () => ({
    useActionHotkeys: (args: { enabled: boolean }) => {
        hotkeys.enabled = args.enabled;
    },
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
            spellBook: null,
            clearSpellBook: vi.fn(),
            mapAim: turnState.mapAim,
            mapPick: turnState.mapPick,
            setAttackReady: vi.fn(),
        },
    }),
    useBonusSpells: () => ({}),
    useAuraZones: () => null,
    useSpellBook: () => ({ actions: { open: vi.fn() } }),
    useAttackWizard: () => ({ actions: { open: vi.fn() } }),
    usePlayerTurn: () => ({
        phase: turnState.phase,
        gate: { resolve: vi.fn(), skipTurn: vi.fn() },
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

import { SceneSlotsContext } from '@/components/battle/scene/layout/SceneSlots';
import { MyTurnControls } from '@/components/battle/turn/MyTurnControls';
import type { BattleParticipant } from '@/types/battle';

const hero = {
    basicInfo: { id: 'h1' },
    spellcasting: { spellSlots: { 1: { current: 1 } }, knownSpells: ['x'] },
} as unknown as BattleParticipant;

describe('MyTurnControls: gating за прапорцями правил', () => {
    afterEach(() => {
        cleanup();
        turnState.phase = 'acting';
        turnState.turnStart = false;
        turnState.mapAim = null;
        turnState.mapPick = null;
        hotkeys.enabled = undefined;
    });

    it('у фазі gate панель старту ходу береться зі слота; без слота її немає', () => {
        rules.current = {
            actionEconomy: { bonusAction: true, reaction: true },
            spells: true,
        };
        turnState.phase = 'gate';
        turnState.turnStart = true;
        render(<MyTurnControls hero={hero} />);
        expect(screen.getByTestId('turn-start-panel')).toBeInTheDocument();
        cleanup();

        turnState.turnStart = false;
        render(<MyTurnControls hero={hero} />);
        expect(
            screen.queryByTestId('turn-start-panel')
        ).not.toBeInTheDocument();
    });

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

    it('hotkeys are enabled only while the actions panel is open and no map aim or pick is active', () => {
        rules.current = {
            actionEconomy: { bonusAction: true, reaction: true },
            spells: true,
        };

        const open = () => {
            const dock = document.body.appendChild(
                document.createElement('div')
            );

            const view = render(
                <SceneSlotsContext value={{ dock }}>
                    <MyTurnControls hero={hero} dock />
                </SceneSlotsContext>
            );

            fireEvent.click(screen.getByRole('button', { name: 'Дія' }));

            return view;
        };

        open().unmount();

        expect(hotkeys.enabled).toBe(true);

        cleanup();
        turnState.mapAim = {};
        open();

        expect(hotkeys.enabled).toBe(false);
    });
});
