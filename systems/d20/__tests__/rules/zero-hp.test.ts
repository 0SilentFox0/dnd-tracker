import { describe, expect, it } from 'vitest';

import { CombatStatus } from '@/lib/constants/battle';
import { textOf } from '@/lib/i18n/test/text';
import {
    makeEffect,
    makeParticipant,
} from '@/lib/utils/abilities/__tests__/fixtures';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { ZeroHpCtx } from '@/lib/utils/rules/systems/types';
import { dropBrokenConcentration } from '@/systems/d20/rules/concentration/damaged';
import { d20OnZeroHp } from '@/systems/d20/rules/zero-hp';
import type { BattleParticipant } from '@/types/battle';

const concentrating = (hp: number): BattleParticipant => {
    const p = makeParticipant({ id: 'c', hp });

    return {
        ...p,
        battleData: {
            ...p.battleData,
            activeEffects: [
                makeEffect('hold', {
                    concentration: { castId: 'x', spellName: 'Bless' },
                }),
            ],
        },
    };
};

const ctx = (
    after: BattleParticipant,
    over: Partial<ZeroHpCtx>
): ZeroHpCtx => ({
    before: after,
    after,
    amount: 5,
    rules: {
        ...DEFAULT_RULES,
        concentration: { enabled: true, dcCap: null },
    },
    rng: () => 0.5,
    participants: [after],
    ...over,
});

describe('dropBrokenConcentration', () => {
    it('drops concentration at 0 HP with a log line', () => {
        const p = concentrating(0);

        const r = dropBrokenConcentration(p, [p]);

        expect(r.participants[0].battleData.activeEffects).toHaveLength(0);
        expect(r.messages).toHaveLength(1);
        expect(textOf(r.messages[0])).toContain('Bless');
    });

    it('drops when the caster is dead', () => {
        const p = concentrating(10);

        p.combatStats.status = CombatStatus.DEAD;

        expect(
            dropBrokenConcentration(p, [p]).participants[0].battleData
                .activeEffects
        ).toHaveLength(0);
    });

    it('keeps concentration for a healthy caster', () => {
        const p = concentrating(7);

        const r = dropBrokenConcentration(p, [p]);

        expect(r.participants).toEqual([p]);
        expect(r.messages).toEqual([]);
    });
});

describe('d20OnZeroHp', () => {
    it('does nothing for non-manual damage (the damaged hook handles it)', () => {
        const p = concentrating(0);

        const r = d20OnZeroHp(ctx(p, {}));

        expect(r.participant).toBe(p);
        expect(r.messages).toEqual([]);
    });

    it('manual drop to 0 HP breaks concentration when the rule is on', () => {
        const p = concentrating(0);

        const r = d20OnZeroHp(ctx(p, { manual: true }));

        expect(r.participant.battleData.activeEffects).toHaveLength(0);
        expect(r.participants[0].battleData.activeEffects).toHaveLength(0);
        expect(r.messages).toHaveLength(1);
    });

    it('keeps concentration when the rule is off', () => {
        const p = concentrating(0);

        const r = d20OnZeroHp(
            ctx(p, {
                manual: true,
                rules: {
                    ...DEFAULT_RULES,
                    concentration: { enabled: false, dcCap: null },
                },
            })
        );

        expect(r.participant.battleData.activeEffects).toHaveLength(1);
        expect(r.messages).toEqual([]);
    });
});
