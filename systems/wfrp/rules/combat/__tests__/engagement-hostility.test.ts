import { describe, expect, it } from 'vitest';

import { ParticipantSide } from '@/lib/constants/battle';
import { placed } from '@/lib/utils/battle/__tests__/fixtures/placed';
import { mazeMap } from '@/lib/utils/battle/modes/maze/__tests__/fixtures';
import {
    engagedFoes,
    isOutnumbering,
} from '@/systems/wfrp/rules/combat/engagement';

const ally = ParticipantSide.ALLY;

const a = placed('a', { side: ally, at: { x: 1, y: 1 } });

const b = placed('b', { side: ally, at: { x: 2, y: 1 } });

describe('engagedFoes follows the mode hostility', () => {
    it('same-side illusion partners are Engaged, plain allies are not', () => {
        const map = mazeMap({
            illusionSwap: {
                pairs: [
                    {
                        a: 'a',
                        b: 'b',
                        aSees: { name: 'X' },
                        bSees: { name: 'Y' },
                    },
                ],
            },
        });

        expect(engagedFoes(a, [a, b], map)).toHaveLength(1);
        expect(engagedFoes(a, [a, b], null)).toHaveLength(0);
    });

    it('isOutnumbering counts mode-hostile same-side partners', () => {
        const c = placed('c', { side: ally, at: { x: 3, y: 1 } });

        const map = mazeMap({
            illusionSwap: {
                pairs: [
                    {
                        a: 'a',
                        b: 'b',
                        aSees: { name: 'X' },
                        bSees: { name: 'Y' },
                    },
                    {
                        a: 'c',
                        b: 'b',
                        aSees: { name: 'X' },
                        bSees: { name: 'Y' },
                    },
                ],
            },
        });

        expect(isOutnumbering(a, b, [a, b, c], map)).toBe(true);
        expect(isOutnumbering(a, b, [a, b, c], null)).toBe(false);
    });
});
