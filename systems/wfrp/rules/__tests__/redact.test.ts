import { describe, expect, it } from 'vitest';

import { DEFAULT_CHARACTERISTICS } from '../characteristics/keys';
import { wfrpAbilitiesOf } from '../combat/participant';
import { redactWfrpSlot } from '../redact';
import { WFRP_RULES } from '../rules-preset';
import { PARTICIPANT_STATE } from '../slots';

import { ParticipantSide } from '@/lib/constants/battle';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import {
    PLAYER_VIEWER,
    redactParticipantsForViewer,
} from '@/lib/utils/battle/view';
import type { BattleParticipant } from '@/types/battle';

const enemy = (): BattleParticipant => {
    const p = createMockParticipant();

    return {
        ...p,
        basicInfo: { ...p.basicInfo, id: 'foe', side: ParticipantSide.ENEMY },
        abilities: {
            ...p.abilities,
            ...wfrpAbilitiesOf(DEFAULT_CHARACTERISTICS, {
                ap: { head: 3, arm: 2, body: 4, leg: 1 },
            }),
        },
        battleData: {
            ...p.battleData,
            system: PARTICIPANT_STATE.write({
                fortune: 3,
                sin: 2,
                channelledSl: 4,
                conditionTests: ['bleeding'],
            }),
        },
    };
};

describe('redactWfrpSlot', () => {
    it('прибирає характеристики, броню, фортуну, гріх і канал ворога', () => {
        const [shown] = redactParticipantsForViewer(
            PLAYER_VIEWER,
            [enemy()],
            WFRP_RULES
        );

        const text = JSON.stringify(shown.abilities.system);

        expect(text).not.toContain('"ap":{"head":3');
        expect(text).not.toContain('"base"');

        const state = PARTICIPANT_STATE.read(shown.battleData.system);

        expect(state).toEqual({ conditionTests: ['bleeding'] });
    });

    it('слот іншого ключа не чіпає', () => {
        const slot = { key: 'd20', data: { a: 1 } };

        expect(redactWfrpSlot(slot, 'abilities')).toBe(slot);
        expect(redactWfrpSlot(slot, 'battle')).toBe(slot);
    });
});
