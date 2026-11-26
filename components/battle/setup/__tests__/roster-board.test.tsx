// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BalanceMeter } from '@/components/battle/setup/balance/BalanceMeter';
import type { SetupData } from '@/components/battle/setup/participants/ParticipantCatalog';
import { RosterBoard } from '@/components/battle/setup/participants/RosterBoard';
import {
    RosterPhoneBar,
    sideCounts,
} from '@/components/battle/setup/participants/RosterPhoneBar';
import { ParticipantSide, ParticipantSourceType } from '@/lib/constants/battle';
import { computeXpBudget } from '@/lib/utils/battle/balance/xp-budget';
import type { BattlePreparationParticipant } from '@/types/battle';

afterEach(cleanup);

const data = {
    characters: [{ id: 'h1', name: 'Зехір', avatar: null }],
    units: [{ id: 'u1', name: 'Вовк', avatar: null }],
} as unknown as SetupData;

const participants: BattlePreparationParticipant[] = [
    { id: 'h1', type: ParticipantSourceType.CHARACTER, side: 'ally' },
    {
        id: 'u1',
        type: ParticipantSourceType.UNIT,
        side: 'enemy',
        quantity: 3,
        reserved: 1,
    },
];

const balance = { kind: 'fair', fair: null, xp: null } as const;

function actions() {
    return { setSide: vi.fn(), remove: vi.fn(), setReserve: vi.fn() };
}

describe('RosterBoard', () => {
    it('⇄, ✕ і резерв у рядку викликають дії', () => {
        const a = actions();

        render(
            <RosterBoard
                participants={participants}
                data={data}
                actions={a}
                balance={balance}
            />
        );

        fireEvent.click(
            screen.getByLabelText('battleSetup.participant.moveToEnemies')
        );
        expect(a.setSide).toHaveBeenCalledWith('h1', ParticipantSide.ENEMY);

        fireEvent.click(
            screen.getAllByLabelText('battleSetup.participant.remove')[1]
        );
        expect(a.remove).toHaveBeenCalledWith('u1');

        expect(screen.getByText(/reserved/)).toBeTruthy();
    });

    it('порожня колонка — пунктирна зона', () => {
        render(
            <RosterBoard
                participants={[participants[0]]}
                data={data}
                actions={actions()}
                balance={balance}
            />
        );
        expect(screen.getByTestId('roster-empty-enemy')).toBeTruthy();
        expect(screen.queryByTestId('roster-empty-ally')).toBeNull();
    });

    it('автопідбір лише коли передано autopick', () => {
        const { rerender } = render(
            <RosterBoard
                participants={participants}
                data={data}
                actions={actions()}
                balance={balance}
            />
        );

        expect(screen.queryByText('autopick-body')).toBeNull();

        rerender(
            <RosterBoard
                participants={participants}
                data={data}
                actions={actions()}
                balance={balance}
                autopick={<div>autopick-body</div>}
            />
        );
        expect(screen.getByText('autopick-body')).toBeTruthy();
    });
});

describe('BalanceMeter', () => {
    it('[?] відкриває деталі балансу', () => {
        render(<BalanceMeter {...balance} units={[]} />);

        expect(screen.queryByTestId('balance-summary')).toBeNull();
        fireEvent.click(
            screen.getByLabelText('battleSetup.balance.detailsAria')
        );
        expect(screen.getByTestId('balance-summary')).toBeTruthy();
    });

    it('xp-режим показує складність і бюджет', () => {
        const xp = computeXpBudget({
            edition: '2014',
            heroLevels: [3, 3, 3, 3],
            enemies: [{ unitId: 'ogre', quantity: 2, xp: 450 }],
        });

        render(<BalanceMeter kind="xp" fair={null} xp={xp} units={[]} />);

        expect(screen.getByTestId('meter-xp-difficulty')).toBeTruthy();
        expect(screen.getByText(/enemyXp/)).toBeTruthy();
    });
});

describe('RosterPhoneBar', () => {
    it('рахує кількість з quantity і відкриває склад', () => {
        expect(sideCounts(participants)).toEqual({ ally: 1, enemy: 3 });

        const set = vi.fn();

        render(
            <RosterPhoneBar
                participants={participants}
                balance={balance}
                roster={{ open: false, set }}
            >
                <div>sheet-body</div>
            </RosterPhoneBar>
        );

        expect(screen.getByText(/versus/).textContent).toContain('"enemy":3');
        fireEvent.click(
            screen.getByRole('button', { name: /participants\.roster$/ })
        );
        expect(set).toHaveBeenCalledWith(true);
    });
});
