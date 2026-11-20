import { describe, expect, it } from 'vitest';

import { bookExample, CANON, LEGACY } from './book-example';

import { textRef } from '@/lib/i18n/text-ref';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { statWithModifiers } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import { applyWfrpConditionTo } from '@/systems/wfrp/rules/conditions/apply';
import type { WfrpConditionKey } from '@/systems/wfrp/rules/conditions/catalog';
import {
    againstSl,
    selfModes,
    selfSlMod,
    selfTestMod,
} from '@/systems/wfrp/rules/conditions/test-mod';
import type { BattleParticipant } from '@/types/battle';

const src = textRef('battleWfrp.log.removed', { target: 'x', condition: 'y' });

const withConds = (
    ...conds: Array<[WfrpConditionKey, number?]>
): BattleParticipant =>
    conds.reduce(
        (p, [key, levels]) =>
            applyWfrpConditionTo(p, {
                key,
                levels,
                round: 1,
                sourceName: src,
                edition: CANON,
            }).participant,
        makeParticipant({ id: 'a' })
    );

describe('canon5e conditions', () => {
    bookExample(184, 'a condition costs 1 SL per level, no target shift', () => {
        const p = withConds(['fatigued', 2]);

        expect(selfSlMod(p, CANON)).toBe(-2);
        expect(selfTestMod(p, 'test', CANON)).toBe(0);
    });

    bookExample(184, 'different conditions do not add: the worst level counts', () => {
        expect(selfSlMod(withConds(['fatigued', 1], ['poisoned', 3]), CANON)).toBe(-3);
        expect(selfSlMod(withConds(['entangled', 2]), CANON)).toBe(0);
    });

    it('the legacy model keeps percent shifts', () => {
        const p = withConds(['fatigued', 2]);

        expect(selfTestMod(p, 'test', LEGACY)).toBe(-20);
        expect(selfSlMod(p, LEGACY)).toBe(0);
    });

    bookExample(185, 'Blinded attacks with Disadvantage', () => {
        expect(selfModes(withConds(['blinded']), 'attack', CANON)).toEqual({
            disadvantage: 1,
        });
        expect(selfModes(withConds(['blinded']), 'test', CANON)).toEqual({});
    });

    bookExample(186, 'Prone and Blinded give melee attackers Advantage', () => {
        expect(againstSl(withConds(['prone']), 'melee', CANON)).toEqual({
            advantage: 1,
            sl: 0,
        });
        expect(againstSl(withConds(['prone'], ['blinded']), 'melee', CANON).advantage).toBe(2);
        expect(againstSl(withConds(['prone']), 'ranged', CANON)).toEqual({
            advantage: 0,
            sl: 0,
        });
    });

    bookExample(187, 'Surprised gives melee attackers +2 SL', () => {
        expect(againstSl(withConds(['surprised']), 'melee', CANON).sl).toBe(2);
    });

    bookExample(186, 'Stunned halves Move and does not skip the action', () => {
        const p = withConds(['stunned']);

        expect(
            p.battleData.activeEffects.some((e) =>
                e.effects.some((x) => x.type === 'skip_action')
            )
        ).toBe(false);
        expect(statWithModifiers([p], 'a', 'speed', 30)).toBe(15);
    });
});
