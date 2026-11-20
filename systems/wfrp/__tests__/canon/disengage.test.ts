import { describe, expect } from 'vitest';

import { bookExample } from './book-example';

import { ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import {
    engagedFoes,
    isOutnumbered,
    isSurrounded,
} from '@/systems/wfrp/rules/combat/engagement';
import type { BattleParticipant } from '@/types/battle';

const at = (
    id: string,
    side: 'ally' | 'enemy',
    x: number,
    y: number
): BattleParticipant => {
    const p = makeParticipant({ id, hp: 10, maxHp: 10 });

    return {
        ...p,
        basicInfo: { ...p.basicInfo, side },
        battleData: { ...p.battleData, position: { x, y } },
    };
};

const hero = at('hero', ParticipantSide.ALLY, 0, 0);

describe('canon: Engagement geometry (p163)', () => {
    bookExample(163, 'only adjacent hostile foes are Engaged', () => {
        const ps = [
            hero,
            at('f1', ParticipantSide.ENEMY, 1, 0),
            at('f2', ParticipantSide.ENEMY, 4, 4),
            at('a1', ParticipantSide.ALLY, 0, 1),
        ];

        expect(engagedFoes(hero, ps, null).map((f) => f.basicInfo.id)).toEqual([
            'f1',
        ]);
    });

    bookExample(163, 'three Engaged foes make the character Surrounded', () => {
        const foes = ['f1', 'f2', 'f3'].map((id, i) =>
            at(id, ParticipantSide.ENEMY, i === 0 ? 1 : 0, i === 0 ? 0 : i)
        );

        expect(isSurrounded(foes.slice(0, 2))).toBe(false);
        expect(isSurrounded(foes)).toBe(true);
    });

    bookExample(163, 'two foes against one character is Outnumbered', () => {
        const f1 = at('f1', ParticipantSide.ENEMY, 1, 0);

        const f2 = at('f2', ParticipantSide.ENEMY, 0, 1);

        expect(isOutnumbered(hero, [f1], [hero, f1], null)).toBe(false);
        expect(isOutnumbered(hero, [f1, f2], [hero, f1, f2], null)).toBe(true);
    });
});
