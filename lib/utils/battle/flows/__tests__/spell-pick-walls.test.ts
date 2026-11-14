import { describe, expect, it } from 'vitest';

import { ParticipantSide } from '@/lib/constants/battle';
import { placed, testMap } from '@/lib/utils/battle/__tests__/fixtures/placed';
import { spellTargetInRange } from '@/lib/utils/battle/flows';
import { DEFAULT_RULES } from '@/lib/utils/rules';

const hero = placed('h', { side: ParticipantSide.ALLY, at: { x: 2, y: 2 } });

const foe = placed('f', { side: ParticipantSide.ENEMY, at: { x: 3, y: 2 } });

describe('вибір цілі заклинання за стіною', () => {
    it('стіна між кастером і ціллю прибирає ціль', () => {
        const map = testMap(6, 6, { walls: ['2:2:e'] });

        expect(spellTargetInRange(map, hero, foe, 30, DEFAULT_RULES)).toBe(
            false
        );
    });

    it('ґрати ціль не ховають, без стін усе доступне', () => {
        expect(
            spellTargetInRange(
                testMap(6, 6, { bars: ['2:2:e'] }),
                hero,
                foe,
                30,
                DEFAULT_RULES
            )
        ).toBe(true);
        expect(
            spellTargetInRange(testMap(6, 6), hero, foe, 30, DEFAULT_RULES)
        ).toBe(true);
    });
});
