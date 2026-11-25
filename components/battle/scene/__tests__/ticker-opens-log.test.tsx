// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LastActionTicker } from '../banners/LastActionTicker';

import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { render } from '@/lib/i18n/test/render-uk';
import type { BattleAction } from '@/types/battle-actions';

vi.unmock('next-intl');

const action = (actor: string, target: string) =>
    ({
        id: 'a1',
        actionType: 'attack',
        actorId: actor,
        actorName: 'Актор',
        targets: [{ participantId: target }],
        hpChanges: [{ participantId: target, change: -5 }],
    }) as unknown as BattleAction;

describe('LastActionTicker', () => {
    afterEach(cleanup);

    it('a tap opens the log through the scene', () => {
        const { wrapper, value, openLog, me, gob } = fakeScene({});

        value.battle.battleLog = [action(me.basicInfo.id, gob.basicInfo.id)];

        render(<LastActionTicker onOpenLog={() => value.log.show()} />, {
            wrapper,
        });

        fireEvent.click(screen.getByRole('button'));

        expect(openLog).toHaveBeenCalledTimes(1);
    });
});
