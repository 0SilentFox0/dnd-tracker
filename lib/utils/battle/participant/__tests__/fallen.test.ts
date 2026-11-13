import { describe, expect, it } from 'vitest';

import { CombatStatus, ParticipantSide } from '@/lib/constants/battle';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { clearFallenEffects } from '@/lib/utils/battle/participant/fallen';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { withDeathSaves } from '@/systems/d20/rules/death-saves/state';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import type { ActiveEffect, BattleParticipant } from '@/types/battle';

const charm: ActiveEffect = {
    id: 'charm',
    name: 'Чари',
    type: 'debuff',
    duration: 2,
    appliedAt: { round: 1, timestamp: new Date(0) },
    effects: [],
    charmOrigin: { side: ParticipantSide.ENEMY, controlledBy: 'dm' },
};

function charmed(
    status: BattleParticipant['combatStats']['status']
): BattleParticipant {
    const b = createMockParticipant();

    return {
        ...b,
        basicInfo: {
            ...b.basicInfo,
            id: 'gob',
            side: ParticipantSide.ALLY,
            controlledBy: 'u',
        },
        combatStats: { ...b.combatStats, status },
        battleData: { ...b.battleData, activeEffects: [charm] },
    };
}

describe('clearFallenEffects', () => {
    it('полеглий зачарований повертається на свій бік без ефектів', () => {
        const [out] = clearFallenEffects([charmed(CombatStatus.DEAD)]);

        expect(out.battleData.activeEffects).toEqual([]);
        expect(out.basicInfo.side).toBe(ParticipantSide.ENEMY);
        expect(out.basicInfo.controlledBy).toBe('dm');
    });

    it('живих не чіпає', () => {
        const list = [charmed(CombatStatus.ACTIVE)];

        expect(clearFallenEffects(list)).toBe(list);
    });
});

describe('clearFallenEffects: герой, що вмирає (5e)', () => {
    const dying = (): BattleParticipant => {
        return withDeathSaves(charmed(CombatStatus.UNCONSCIOUS), {
            successes: 0,
            failures: 0,
            stable: false,
        });
    };

    it('зберігає ефекти й стани', () => {
        const list = [dying()];

        expect(clearFallenEffects(list)).toBe(list);
    });

    it('непритомний без кидків смерті (HOMM) очищається як раніше', () => {
        expect(
            clearFallenEffects([charmed(CombatStatus.UNCONSCIOUS)])[0]
                .battleData.activeEffects
        ).toEqual([]);
    });

    it('помер від провалів — ефекти знімаються', () => {
        const dead = {
            ...dying(),
            combatStats: { ...dying().combatStats, status: CombatStatus.DEAD },
        };

        expect(clearFallenEffects([dead])[0].battleData.activeEffects).toEqual(
            []
        );
    });
});

describe('clearFallenEffects: keepsWhenDown (wfrp)', () => {
    const bleeder = (
        status: BattleParticipant['combatStats']['status']
    ): BattleParticipant => {
        const p = charmed(status);

        const bled = ruleSystemOf(WFRP_RULES).conditions!.apply([p], 'gob', {
            key: 'bleeding',
            levels: 2,
            round: 1,
            sourceName: 'x',
        }).participants[0];

        return {
            ...bled,
            battleData: {
                ...bled.battleData,
                activeEffects: [...bled.battleData.activeEffects, charm],
            },
        };
    };

    it('unconscious keeps wfrp condition effects (not foreign ones) and is stable afterwards', () => {
        const out = clearFallenEffects(
            [bleeder(CombatStatus.UNCONSCIOUS)],
            WFRP_RULES
        );

        expect(
            out[0].battleData.activeEffects.map((e) => e.abilityKey)
        ).toEqual(['wfrp:cond:bleeding']);
        expect(clearFallenEffects(out, WFRP_RULES)).toBe(out);
    });

    it('an applied unconscious condition survives clearFallenEffects and is listed', () => {
        const wf = ruleSystemOf(WFRP_RULES).conditions!;

        const applied = wf.apply([charmed(CombatStatus.UNCONSCIOUS)], 'gob', {
            key: 'unconscious',
            levels: 1,
            round: 1,
            sourceName: 'x',
        }).participants;

        const out = clearFallenEffects(applied, WFRP_RULES);

        expect(wf.list(out[0]).map((c) => c.key)).toContain('unconscious');
    });

    it('dead loses everything', () => {
        expect(
            clearFallenEffects([bleeder(CombatStatus.DEAD)], WFRP_RULES)[0]
                .battleData.activeEffects
        ).toEqual([]);
    });

    it('systems without the hook clear unconscious as before', () => {
        expect(
            clearFallenEffects(
                [bleeder(CombatStatus.UNCONSCIOUS)],
                DEFAULT_RULES
            )[0].battleData.activeEffects
        ).toEqual([]);
    });
});
