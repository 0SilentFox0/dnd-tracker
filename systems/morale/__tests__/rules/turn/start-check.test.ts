import { beforeAll, describe, expect, it } from 'vitest';

import {
    makeParticipant,
    resolved,
} from '@/lib/utils/abilities/__tests__/fixtures';
import { parseRules } from '@/lib/utils/rules/schema';
import type { ActGateScope } from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';

let ruleSystemOf: typeof import('@/lib/utils/rules/systems').ruleSystemOf;

beforeAll(async () => {
    await import('@/lib/server/systems/registry');

    ({ ruleSystemOf } = await import('@/lib/utils/rules/systems'));
}, 30_000);

const legacy = (over: Partial<BattleParticipant['actionFlags']> = {}) => {
    const p = makeParticipant({ id: 'p' });

    return {
        ...p,
        combatStats: { ...p.combatStats, morale: 2, moraleCap: 3 },
        actionFlags: { ...p.actionFlags, ...over },
    } as BattleParticipant;
};

const scope = (p: BattleParticipant, rules: ActGateScope['rules']) =>
    ({
        participants: [p],
        scene: { turnIndex: 0, pendingMoraleCheck: null },
        rules,
    }) satisfies ActGateScope;

const startCheckOf = (system: Parameters<typeof parseRules>[0]) =>
    ruleSystemOf(parseRules(system)).combat.turn?.startCheck;

describe('startCheck', () => {
    it('голий dnd5e не має перевірки старту ходу, навіть для легасі-знімка з мораллю (M1)', () => {
        expect(startCheckOf({ system: { key: 'dnd5e' } })).toBeUndefined();
    });

    it.each([
        ['homm', { system: { key: 'homm' } }],
        ['dnd5e + morale', { system: { key: 'dnd5e', modules: ['morale'] } }],
    ])('%s: мораль не нуль → перевірка потрібна', (_, raw) => {
        const rules = parseRules(raw);

        const p = legacy();

        expect(startCheckOf(raw)?.due(scope(p, rules), 'p')).toBe(true);
    });

    it('учасник, що вже діяв, перевірки не чекає', () => {
        const raw = { system: { key: 'homm' } };

        const p = legacy({ hasUsedAction: true });

        expect(startCheckOf(raw)?.due(scope(p, parseRules(raw)), 'p')).toBe(
            false
        );
    });

    it('ignoreMorale гасить перевірку', () => {
        const raw = { system: { key: 'homm' } };

        const base = legacy();

        const p = {
            ...base,
            battleData: {
                ...base.battleData,
                resolvedAbilities: [
                    resolved({
                        trigger: { event: 'passive' },
                        effects: [{ kind: 'flag', flag: 'ignoreMorale' }],
                    }),
                ],
            },
        } as BattleParticipant;

        expect(startCheckOf(raw)?.due(scope(p, parseRules(raw)), 'p')).toBe(
            false
        );
    });

    it('outcomeOf: результат лише для свого учасника', () => {
        const check = startCheckOf({ system: { key: 'homm' } });

        const pending = {
            participantId: 'p',
            d10Roll: 1,
            moraleResult: {
                shouldSkipTurn: true,
                hasExtraTurn: false,
                moralePositive: false,
                message: '',
            },
        };

        expect(check?.outcomeOf(pending, 'p')).toBe('skip');
        expect(check?.outcomeOf(pending, 'other')).toBeUndefined();
        expect(check?.outcomeOf(null, 'p')).toBeUndefined();
    });
});
