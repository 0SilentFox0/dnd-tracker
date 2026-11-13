import { describe, expect, it } from 'vitest';

import { AttackType } from '@/lib/constants/battle';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { rollModeReasons } from '@/lib/utils/battle/attack/bonus';
import {
    canUseInspiration,
    INSPIRATION_LABEL,
    spendInspiration,
} from '@/lib/utils/battle/attack/inspiration';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { d20State, withD20State } from '@/systems/d20/rules/state';
import type { BattleAttack } from '@/types/battle';

const sword: BattleAttack = {
    id: 's',
    name: 'Меч',
    type: AttackType.MELEE,
    attackBonus: 0,
    damageDice: '1d8',
    damageType: 'slashing',
};

const on = {
    ...DEFAULT_RULES,
    outOfCombat: { ...DEFAULT_RULES.outOfCombat, inspiration: true },
};

describe('inspiration in attacks', () => {
    it('adds an advantage reason only when asked', () => {
        const p = createMockParticipant();

        expect(
            rollModeReasons(p, sword, [p], {
                rules: DEFAULT_RULES,
                inspiration: true,
            }).advantage
        ).toEqual([INSPIRATION_LABEL]);
        expect(
            rollModeReasons(p, sword, [p], { rules: DEFAULT_RULES }).advantage
        ).toEqual([]);
    });

    it('canUseInspiration needs the rule and the flag', () => {
        const p = createMockParticipant();

        const inspired = {
            ...p,
            battleData: { ...p.battleData, inspiration: true },
        };

        expect(canUseInspiration(inspired, on)).toBe(true);
        expect(canUseInspiration(inspired, DEFAULT_RULES)).toBe(false);
        expect(canUseInspiration(p, on)).toBe(false);
    });

    it('spendInspiration clears only the attacker', () => {
        const a = {
            ...createMockParticipant(),
            battleData: {
                ...createMockParticipant().battleData,
                inspiration: true,
            },
        };

        const other = createMockParticipant();

        const [after, untouched] = spendInspiration(
            [a, { ...other, basicInfo: { ...other.basicInfo, id: 'other' } }],
            a.basicInfo.id,
            on
        );

        expect(d20State(after)).toEqual({ inspirationSpent: true });
        expect(after.battleData.inspiration).toBeUndefined();
        expect(untouched.battleData.system).toBeUndefined();
    });

    it('the inspiration of the d20 slot is available, and spending it leaves the slot spent', () => {
        const p = withD20State(createMockParticipant(), { inspiration: true });

        expect(canUseInspiration(p, on)).toBe(true);

        const [after] = spendInspiration([p], p.basicInfo.id, on);

        expect(canUseInspiration(after, on)).toBe(false);
        expect(d20State(after).inspirationSpent).toBe(true);
    });

    it('a system without the inspiration hook cannot use or spend it', () => {
        const p = withD20State(createMockParticipant(), { inspiration: true });

        const wfrp = {
            ...on,
            system: { key: 'wfrp' as const },
        };

        expect(canUseInspiration(p, wfrp)).toBe(false);
        expect(spendInspiration([p], p.basicInfo.id, wfrp)).toEqual([p]);
    });
});
