// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

const rules = vi.hoisted(() => ({ systemKey: 'dnd5e' }));

vi.mock('@/lib/hooks/battle', () => ({
    useBattleRules: () => ({ systemKey: rules.systemKey }),
}));

vi.mock('@/components/battle/use-system-battle-ui', async () => {
    const { systemUiOf } = await import('@/components/systems');

    return { useSystemBattleUi: () => systemUiOf(rules.systemKey).battle };
});

import { RollStep } from '../RollStep';
import type { AttackWizardModel } from '../shared';

import { render } from '@/lib/i18n/test/render-uk';
import type { BattleParticipant } from '@/types/battle';

vi.unmock('next-intl');

const target = {
    basicInfo: { id: 't', name: 'Орк' },
} as unknown as BattleParticipant;

const wizard = (serverJudged: boolean) => {
    const actions = {
        roll: vi.fn(),
        aiRoll: vi.fn(),
        back: vi.fn(),
        setSystemInput: vi.fn(),
        setMode: vi.fn(),
        setInspiration: vi.fn(),
    };

    return {
        state: {
            index: 0,
            diceSlots: [8],
            strikes: [{ targetId: 't', damage: [] }],
        },
        view: {
            serverJudged,
            cover: new Set<string>(),
            rollMode: 'normal',
            inspirationAvailable: false,
            attacker: { battleData: {} },
            judged: {
                target: { target: 41, label: 'WS' },
                sceneState: undefined,
                attackerSide: 'ally',
            },
        },
        actions,
    } as unknown as AttackWizardModel;
};

describe('RollStep', () => {
    afterEach(cleanup);

    it('dnd5e keeps the d20 roll body', () => {
        rules.systemKey = 'dnd5e';

        const { container } = render(
            <RollStep wizard={wizard(false)} target={target} />
        );

        expect(screen.getByText('Кидок атаки · d20')).toBeTruthy();
        expect(container).toMatchSnapshot();
    });

    it('wfrp renders the system roll body with the target and momentum line', () => {
        rules.systemKey = 'wfrp';
        render(<RollStep wizard={wizard(true)} target={target} />);
        expect(screen.getByText('Кидок атаки · d100')).toBeTruthy();
        expect(screen.getByText(/Ціль 41%/)).toBeTruthy();
        expect(screen.getByText('Авто')).toBeTruthy();
    });
});
