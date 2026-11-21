import { describe, expect } from 'vitest';

import { bookExample } from './book-example';

import '@/lib/server/systems/registry';
import { ParticipantSide } from '@/lib/constants/battle';
import {
    context,
    participant,
} from '@/lib/server/battles/__tests__/mutations/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { applyWfrpCrit } from '@/systems/wfrp/rules/combat/crit-effect';
import {
    isRoundsFormula,
    resolveRounds,
    rollRoundsFormula,
} from '@/systems/wfrp/rules/combat/rounds-formula';
import { WFRP_CONDITION_REGISTRY } from '@/systems/wfrp/rules/conditions/catalog';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { withWfrpState } from '@/systems/wfrp/rules/state';
import { RowSchema } from '@/systems/wfrp/rules/tables/schema';
import { conditionTestMutation } from '@/systems/wfrp/server/battle/condition-test-mutation';
import type { BattleParticipant } from '@/types/battle';

const rules = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const conditions = ruleSystemOf(rules).conditions!;

const heroAt = (x: number): BattleParticipant => {
    const base = participant('hero', { controlledBy: 'user-1' });

    const placed = {
        ...base,
        battleData: { ...base.battleData, position: { x, y: 0 } },
    };

    return conditions.apply([placed], 'hero', {
        key: 'broken',
        levels: 2,
        round: 1,
        sourceName: 'dm',
    }).participants[0];
};

const foeAt = (x: number): BattleParticipant => {
    const base = participant('f1', {
        side: ParticipantSide.ENEMY,
        controlledBy: 'dm',
    });

    return withWfrpState(
        { ...base, battleData: { ...base.battleData, position: { x, y: 0 } } },
        { engagedWith: { hero: 2 } }
    );
};

const ctxOf = (participants: BattleParticipant[]) => {
    const c = context({ participants, rng: () => 0.5 });

    return {
        ...c,
        meta: {
            ...c.meta,
            rules,
            map: { cols: 10, rows: 5, background: null, opacity: 0.3 },
        },
    };
};

const attempt = (participants: BattleParticipant[]) =>
    conditionTestMutation(ctxOf(participants), {
        participantId: 'hero',
        condition: 'broken',
        roll: 10,
    });

describe('canon: Broken rally (p186)', () => {
    bookExample(186, 'no rally test while Engaged', () => {
        expect(() => attempt([heroAt(1), foeAt(2)])).toThrow(
            'errors.conditionTestEngaged'
        );
    });

    bookExample(186, 'the rally test is an optional attempt when free', () => {
        const out = attempt([heroAt(1), foeAt(8)]);

        expect(out.events.length).toBeGreaterThan(0);
    });
});

describe('canon: Deafened (p186)', () => {
    bookExample(186, 'stacks and is removed by an Endurance test', () => {
        expect(WFRP_CONDITION_REGISTRY.deafened.leveled).not.toBe(false);
        expect(WFRP_CONDITION_REGISTRY.deafened.endTest).toEqual({
            skill: 'endurance',
        });
    });
});

describe('canon: temporary injury duration 1d10 - TB (p174)', () => {
    bookExample(174, 'the formula is validated in table rows', () => {
        expect(isRoundsFormula('1d10 - TB')).toBe(true);
        expect(isRoundsFormula('2d6+1')).toBe(true);
        expect(isRoundsFormula('banana')).toBe(false);

        const row = (roundsFormula: string) =>
            RowSchema.safeParse({
                max: 10,
                effects: [{ type: 'marker', key: 'winded', roundsFormula }],
            }).success;

        expect(row('1d10 - TB')).toBe(true);
        expect(row('nope')).toBe(false);
    });

    bookExample(174, 'duration is the roll minus TB, at least one round', () => {
        const rolled = rollRoundsFormula('1d10 - TB', () => 0.55);

        expect(rolled).toEqual({ base: 6, tb: -1 });
        expect(resolveRounds(rolled, 3)).toBe(3);
        expect(resolveRounds(rolled, 9)).toBe(1);
    });

    bookExample(174, 'a rolled marker lands with the resolved duration', () => {
        const target = heroAt(1);

        const out = applyWfrpCrit(
            target,
            {
                id: 'body.1',
                text: 'x',
                bonusDamage: 0,
                conditions: [],
                markers: ['winded'],
                markerRoundsRolled: { winded: { base: 8, tb: -1 } },
                death: false,
            },
            1
        ).participant;

        const winded = out.battleData.activeEffects.find((e) =>
            e.name.startsWith('crit.wfrp.')
        );

        expect(winded?.duration).toBe(5);
    });
});
