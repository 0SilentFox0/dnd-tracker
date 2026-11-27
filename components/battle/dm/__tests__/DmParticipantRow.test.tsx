// @vitest-environment happy-dom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/hooks/battle', () => ({
    useBattleRules: () => ({
        hpTerm: 'hp',
        lair: { present: () => false, active: () => false },
    }),
    useModeView: () => ({ view: null }),
}));

vi.mock('@/lib/hooks/common', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/hooks/common')>()),
    useConfirm: () => () => Promise.resolve(true),
}));

import { DmParticipantRow } from '../DmParticipantRow';

import { ParticipantSourceType } from '@/lib/constants/battle';
import type { DmParticipantActions } from '@/lib/hooks/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';

afterEach(cleanup);

function setup() {
    const participant = makeParticipant({ id: 'gob', side: 'enemy' });

    participant.basicInfo.sourceType = ParticipantSourceType.UNIT;

    const actions = {
        onChangeHp: vi.fn(),
        onTakeControl: vi.fn(),
        onRemove: vi.fn(),
        onToReserve: vi.fn(),
        onKill: vi.fn(),
        onDone: vi.fn(),
    } as unknown as DmParticipantActions;

    const view = render(
        <DmParticipantRow
            participant={participant}
            controlled={false}
            actions={actions}
        />
    );

    return { view, actions, participant };
}

describe('DmParticipantRow keeps the DM panel open', () => {
    it.each([
        ['battleDm.row.remove', 'onRemove'],
        ['battleDm.row.kill', 'onKill'],
        ['battleDm.row.toReserve', 'onToReserve'],
    ] as const)('%s does not close the panel', async (title, handler) => {
        const { view, actions, participant } = setup();

        fireEvent.click(view.getByTitle(title));

        await waitFor(() =>
            expect(actions[handler]).toHaveBeenCalledWith(participant)
        );
        expect(actions.onDone).not.toHaveBeenCalled();
    });
});
