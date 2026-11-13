import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { seq } from '@/lib/utils/abilities/__tests__/fixtures';
import { resolveRetaliation } from '@/lib/utils/battle/attack/__tests__/helpers';
import {
    joinParticipant,
    splitParticipant,
} from '@/lib/utils/battle/store/split-participant';
import { hashJson } from '@/lib/utils/battle/store/stable-json';
import type { StoredParticipant } from '@/lib/utils/battle/store/types';
import { resetTurnState } from '@/lib/utils/battle/turn/turn-state';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { retaliationsUsedOf } from '@/systems/retaliation/rules/state';
import type { BattleParticipant } from '@/types/battle';

// two rows of a completed HOMM5 battle (hero + unit) as stored before the d20 slot existed
const ROWS = JSON.parse(
    readFileSync(
        join(__dirname, 'fixtures/e2-legacy/homm5-participants.json'),
        'utf8'
    )
) as StoredParticipant[];

const [HERO_ROW, UNIT_ROW] = ROWS;

const place = { orderIndex: 0, isPending: false };

/** the same values in the slot form: the counter moves from state.retaliationsUsed into the d20 slot ext */
function lifted(row: StoredParticipant): StoredParticipant {
    const { retaliationsUsed, ...state } = row.state;

    return {
        ...row,
        state: {
            ...state,
            system: {
                key: 'd20',
                data: { ext: { retaliation: { used: retaliationsUsed ?? 0 } } },
            },
        },
    };
}

const join = (row: StoredParticipant): BattleParticipant => {
    const p = joinParticipant(row, 'b1');

    return { ...p, battleData: { ...p.battleData, dormant: undefined } };
};

function play(hero: BattleParticipant, unit: BattleParticipant) {
    const input = {
        rules: DEFAULT_RULES,
        participants: [unit, hero],
        attackerId: unit.basicInfo.id,
        defenderId: hero.basicInfo.id,
        attack: unit.battleData.attacks[0],
        attackRoll: { isCriticalFail: false },
        round: 1,
        battleId: 'b1',
        rng: seq(0.85),
    };

    const first = resolveRetaliation(input);

    const after = first?.participants ?? [];

    const second = resolveRetaliation({ ...input, participants: after });

    const turned = after.map((p) => ({
        ...p,
        battleData: {
            ...p.battleData,
            ...resetTurnState(p, { rules: DEFAULT_RULES }),
        },
    }));

    return { first, second, after, turned };
}

beforeAll(async () => {
    await import('@/lib/utils/rules/systems/registry');
}, 30_000);

describe('HOMM5 participants stored before the d20 slot', () => {
    it('the fixture rows are the legacy shape with consistent hashes', () => {
        for (const row of ROWS) {
            expect(row.snapshotHash).toBe(hashJson(row.snapshot));
            expect(row.state.system).toBeUndefined();
        }

        expect(HERO_ROW.state.retaliationsUsed).toBe(0);
    });

    it('a retaliation gives the same result over the old and the lifted form', () => {
        const legacy = play(join(HERO_ROW), join(UNIT_ROW));

        const slot = play(join(lifted(HERO_ROW)), join(lifted(UNIT_ROW)));

        expect(legacy.first).not.toBeNull();
        expect(slot.first).not.toBeNull();
        expect(JSON.stringify(slot.first?.battleAction)).toBe(
            JSON.stringify(legacy.first?.battleAction)
        );
        expect(slot.after.map((p) => p.combatStats)).toEqual(
            legacy.after.map((p) => p.combatStats)
        );
        expect(slot.after.map((p) => p.actionFlags)).toEqual(
            legacy.after.map((p) => p.actionFlags)
        );
        expect(legacy.second).toBeNull();
        expect(slot.second).toBeNull();
    });

    it('rows after the mutation are in the new form with a consistent hash', () => {
        for (const row of [HERO_ROW, lifted(HERO_ROW)]) {
            const { after } = play(join(row), join(UNIT_ROW));

            const hero = after.find(
                (p) => p.basicInfo.id === HERO_ROW.columns.id
            ) as BattleParticipant;

            const stored = splitParticipant(hero, place);

            expect(stored.state.system).toEqual({
                key: 'd20',
                data: { ext: { retaliation: { used: 1 } } },
            });
            expect('retaliationsUsed' in stored.state).toBe(false);
            expect(stored.snapshotHash).toBe(hashJson(stored.snapshot));
        }
    });

    it('the next turn gives the reaction back in either form', () => {
        for (const row of [HERO_ROW, lifted(HERO_ROW)]) {
            const { turned } = play(join(row), join(UNIT_ROW));

            const hero = turned.find(
                (p) => p.basicInfo.id === HERO_ROW.columns.id
            ) as BattleParticipant;

            expect(retaliationsUsedOf(hero)).toBe(0);
        }
    });
});
