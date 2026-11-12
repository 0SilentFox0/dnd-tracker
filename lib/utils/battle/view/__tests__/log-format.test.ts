import { describe, expect, it } from 'vitest';

import { makeT } from '@/lib/i18n/test/mock-t';
import { getLogEntryDetailLines } from '@/lib/utils/battle/view/log-format';
import type { BattleAction } from '@/types/battle';

describe('лог: фраза криту', () => {
    const entry = (flavor?: string) =>
        ({
            actionType: 'attack',
            actorName: 'A',
            targets: [],
            actionDetails: {
                criticalEffect: {
                    id: 3,
                    name: 'Ефект',
                    description: 'опис',
                    type: 'success',
                    flavor,
                },
            },
            hpChanges: [],
            resultText: '',
        }) as unknown as BattleAction;

    it('без фрази — як раніше', () => {
        expect(getLogEntryDetailLines(entry(), makeT())).toEqual([
            'battleLog.details.effect {"id":3}: Ефект — опис',
        ]);
    });

    it('фраза не дублюється в деталях — вона вже в resultText', () => {
        expect(getLogEntryDetailLines(entry('Фраза.'), makeT())).toEqual([
            'battleLog.details.effect {"id":3}: Ефект — опис',
        ]);
    });
});

describe('лог: percentile і Wounds', () => {
    const entry = {
        actionType: 'attack',
        actorName: 'A',
        targets: [],
        actionDetails: {
            attackRoll: 24,
            attackBonus: 0,
            totalAttackValue: 24,
            targetAC: 38,
            system: { key: 'wfrp', data: { attack: { roll: 24 } } },
        },
        hpChanges: [{ participantName: 'B', change: 2 }],
        resultText: '',
    } as unknown as BattleAction;

    it('d100-запис без d20-рядків, Wounds замість HP', () => {
        expect(getLogEntryDetailLines(entry, makeT(), true)).toEqual([
            'B: battleLog.details.woundsChange {"value":"-2"}',
        ]);
        expect(getLogEntryDetailLines(entry, makeT())).toEqual([
            'B: battleLog.details.hpChange {"value":"-2"}',
        ]);
    });
});
