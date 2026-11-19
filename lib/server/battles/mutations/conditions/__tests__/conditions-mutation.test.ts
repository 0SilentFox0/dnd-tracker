import { describe, expect, it } from 'vitest';

import {
    battleConditionsMutation,
    battleConditionsSchema,
} from '../conditions-mutation';

import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    context,
    goblin,
    hero,
} from '@/lib/server/battles/__tests__/mutations/fixtures';
import { hasCondition } from '@/lib/utils/battle/conditions';
import { eventTextOf } from '@/lib/utils/battle/log/__tests__/event-text';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import {
    beginConcentration,
    hasConcentration,
} from '@/systems/d20/rules/concentration/sustain';
import { applyCondition5e } from '@/systems/d20/rules/conditions/apply';
import type { BattleParticipant } from '@/types/battle';

const dmCtx = (participants: BattleParticipant[] = [hero, goblin]) =>
    context({ participants, isDM: true });

const byId = (ps: BattleParticipant[], id: string) =>
    ps.find((p) => p.basicInfo.id === id) as BattleParticipant;

describe('battleConditionsMutation', () => {
    it('apply prone: ефект від ДМ і подія', () => {
        const out = battleConditionsMutation(dmCtx(), {
            action: 'apply',
            participantId: 'gob',
            condition: 'prone',
            rounds: 3,
        });

        const effects = byId(out.participants, 'gob').battleData.activeEffects;

        expect(effects).toHaveLength(1);
        expect(effects[0]).toMatchObject({ name: 'prone', type: 'condition' });
        expect(effects[0].source).toBeUndefined();
        expect(eventTextOf(out.events[0])).toContain('ДМ: Гоблін — повалений');
    });

    it('без rounds стан постійний', () => {
        const out = battleConditionsMutation(dmCtx(), {
            action: 'apply',
            participantId: 'gob',
            condition: 'prone',
        });

        expect(
            byId(out.participants, 'gob').battleData.activeEffects[0].permanent
        ).toBe(true);
    });

    it('blinded у кампанії wfrp: CONDITION_UNKNOWN', () => {
        const ctx = dmCtx();

        expect(() =>
            battleConditionsMutation(
                {
                    ...ctx,
                    meta: {
                        ...ctx.meta,
                        rules: { ...DEFAULT_RULES, system: { key: 'wfrp' } },
                    },
                },
                { action: 'apply', participantId: 'gob', condition: 'blinded' }
            )
        ).toThrow(API_ERRORS.CONDITION_UNKNOWN);
    });

    it('схема приймає довільний ключ за регексом, відкидає сміття', () => {
        const parse = (condition: string) =>
            battleConditionsSchema.safeParse({
                action: 'apply',
                participantId: 'gob',
                condition,
            }).success;

        expect(parse('prone')).toBe(true);
        expect(parse('custom:x')).toBe(true);
        expect(parse('Bad Key!')).toBe(false);
    });

    it('імунітет блокує', () => {
        const withFlag = applyCondition5e([hero, goblin], 'gob', {
            key: 'petrified',
            rounds: 3,
            source: undefined,
            sourceName: 'X',
            timedKey: 't',
            round: 1,
            rules: DEFAULT_RULES,
        }).participants;

        expect(() =>
            battleConditionsMutation(dmCtx(withFlag), {
                action: 'apply',
                participantId: 'gob',
                condition: 'poisoned',
            })
        ).toThrow(API_ERRORS.CONDITION_IMMUNE);
    });

    it('remove prone знімає всі ефекти з цим ключем, але не чужі через implies', () => {
        let ps = [hero, goblin];

        ps = applyCondition5e(ps, 'gob', {
            key: 'prone',
            rounds: 3,
            source: undefined,
            sourceName: 'ДМ',
            timedKey: 'a',
            round: 1,
            rules: DEFAULT_RULES,
        }).participants;
        ps = applyCondition5e(ps, 'gob', {
            key: 'prone',
            rounds: 3,
            source: {
                participantId: 'hero',
                abilityId: 'x',
                abilityName: 'X',
            } as never,
            sourceName: 'X',
            timedKey: 'b',
            round: 1,
            rules: DEFAULT_RULES,
        }).participants;
        ps = applyCondition5e(ps, 'gob', {
            key: 'paralyzed',
            rounds: 3,
            source: undefined,
            sourceName: 'ДМ',
            timedKey: 'c',
            round: 1,
            rules: DEFAULT_RULES,
        }).participants;

        const out = battleConditionsMutation(dmCtx(ps), {
            action: 'remove',
            participantId: 'gob',
            condition: 'prone',
        });

        const g = byId(out.participants, 'gob');

        expect(g.battleData.activeEffects.map((e) => e.name)).toEqual([
            'paralyzed',
        ]);
    });

    it('remove incapacitated не знімає paralyzed', () => {
        const ps = applyCondition5e([hero, goblin], 'gob', {
            key: 'paralyzed',
            rounds: 3,
            source: undefined,
            sourceName: 'ДМ',
            timedKey: 'c',
            round: 1,
            rules: DEFAULT_RULES,
        }).participants;

        expect(() =>
            battleConditionsMutation(dmCtx(ps), {
                action: 'remove',
                participantId: 'gob',
                condition: 'incapacitated',
            })
        ).toThrow(API_ERRORS.CONDITION_ABSENT);
        expect(hasCondition(byId(ps, 'gob'), 'paralyzed')).toBe(true);
    });

    it('remove exhaustion відновлює maxHp', () => {
        const start = byId([goblin], 'gob').combatStats.maxHp;

        let ps = applyCondition5e([hero, goblin], 'gob', {
            key: 'exhaustion',
            levels: 4,
            rounds: 99,
            permanent: true,
            source: undefined,
            sourceName: 'ДМ',
            timedKey: 'e',
            round: 1,
            rules: DEFAULT_RULES,
        }).participants;

        expect(byId(ps, 'gob').combatStats.maxHp).toBeLessThan(start);

        ps = battleConditionsMutation(dmCtx(ps), {
            action: 'remove',
            participantId: 'gob',
            condition: 'exhaustion',
        }).participants;

        expect(byId(ps, 'gob').combatStats.maxHp).toBe(start);
    });

    it('apply stunned знімає концентрацію', () => {
        const ps = beginConcentration(
            [hero, goblin],
            'gob',
            'c1',
            'Благословення',
            10,
            1
        ).participants;

        expect(hasConcentration(byId(ps, 'gob'))).toBe(true);

        const out = battleConditionsMutation(dmCtx(ps), {
            action: 'apply',
            participantId: 'gob',
            condition: 'stunned',
            rounds: 2,
        });

        expect(hasConcentration(byId(out.participants, 'gob'))).toBe(false);
    });
});

describe('battleConditionsSchema', () => {
    it('сміттєвий ключ відхиляється схемою, невідомий — мутацією', () => {
        expect(
            battleConditionsSchema.safeParse({
                action: 'apply',
                participantId: 'x',
                condition: 'Not A Key',
            }).success
        ).toBe(false);
        expect(() =>
            battleConditionsMutation(dmCtx(), {
                action: 'apply',
                participantId: 'gob',
                condition: 'sleepy',
            })
        ).toThrow(API_ERRORS.CONDITION_UNKNOWN);
        expect(
            battleConditionsSchema.safeParse({
                action: 'remove',
                participantId: 'x',
                condition: 'prone',
            }).success
        ).toBe(true);
    });
});

describe('battleConditionsMutation sources', () => {
    const apply = (extra: { sourceId?: string } = {}) =>
        battleConditionsMutation(dmCtx(), {
            action: 'apply',
            participantId: 'gob',
            condition: 'frightened',
            ...extra,
        });

    it('frightened without a picked source falls back to every hostile', () => {
        const effects = byId(apply().participants, 'gob').battleData
            .activeEffects;

        expect(effects.map((e) => e.source?.participantId)).toEqual([
            hero.basicInfo.id,
        ]);
    });

    it('a picked source is used as is', () => {
        const effects = byId(
            apply({ sourceId: hero.basicInfo.id }).participants,
            'gob'
        ).battleData.activeEffects;

        expect(effects[0].source?.participantId).toBe(hero.basicInfo.id);
    });

    it('unrelated conditions keep no source', () => {
        const out = battleConditionsMutation(dmCtx(), {
            action: 'apply',
            participantId: 'gob',
            condition: 'prone',
        });

        expect(
            byId(out.participants, 'gob').battleData.activeEffects[0].source
        ).toBeUndefined();
    });
});
