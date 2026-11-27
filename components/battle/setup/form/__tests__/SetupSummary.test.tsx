// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SetupSummary } from '@/components/battle/setup/form/SetupSummary';
import { ParticipantSide } from '@/lib/constants/battle';
import type { BattlePreparationParticipant } from '@/types/battle';

afterEach(cleanup);

const member = (side: ParticipantSide) =>
    ({
        id: side,
        type: 'unit',
        side,
        quantity: 1,
    }) as BattlePreparationParticipant;

const balance = { kind: 'fair', fair: null, xp: null } as const;

describe('SetupSummary', () => {
    it('shows "no enemies" while the enemy side is empty', () => {
        render(
            <SetupSummary
                participants={[member(ParticipantSide.ALLY)]}
                balance={balance}
                map={{ enabled: false, cols: 0, rows: 0 }}
            />
        );

        expect(
            screen.getByText('battleSetup.form.summary.noEnemies')
        ).toBeTruthy();
        expect(screen.getByText('battleSetup.form.summary.noMap')).toBeTruthy();
    });

    it('shows the verdict and map size once both sides exist', () => {
        render(
            <SetupSummary
                participants={[
                    member(ParticipantSide.ALLY),
                    member(ParticipantSide.ENEMY),
                ]}
                balance={balance}
                map={{ enabled: true, cols: 20, rows: 15 }}
            />
        );

        expect(
            screen.queryByText('battleSetup.form.summary.noEnemies')
        ).toBeNull();
        expect(screen.getByText('battleSetup.balance.shortEmpty')).toBeTruthy();
        expect(screen.getByText(/battleSetup.form.summary.map/)).toBeTruthy();
    });
});
