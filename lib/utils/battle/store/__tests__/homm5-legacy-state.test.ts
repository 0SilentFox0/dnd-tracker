import { readFileSync } from 'node:fs';
import { join as joinPath } from 'node:path';
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

// two rows of a completed HOMM5 battle (hero + unit) with the counter moved into the d20 slot
const ROWS = JSON.parse(
    readFileSync(
        joinPath(__dirname, 'fixtures/e2-legacy/homm5-participants.json'),
        'utf8'
    )
) as StoredParticipant[];

const place = { orderIndex: 0, isPending: false };

const HERO_ID = ROWS[0].columns.id;

function lifted(row: StoredParticipant): StoredParticipant {
    const { retaliationsUsed, ...state } = row.state as unknown as Record<
        string,
        unknown
    >;

    return {
        ...row,
        state: {
            ...state,
            system: {
                key: 'd20',
                data: {
                    ext: {
                        retaliation: { used: (retaliationsUsed as number) ?? 0 },
                    },
                },
            },
        },
    } as unknown as StoredParticipant;
}

const [HERO_ROW, UNIT_ROW] = ROWS.map(lifted);

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

describe('HOMM5 participants in the d20 slot form', () => {
    it('the fixture rows have consistent hashes and the counter in the slot', () => {
        for (const row of ROWS) {
            expect(row.snapshotHash).toBe(hashJson(row.snapshot));
            expect(row.state.system).toBeUndefined();
        }

        expect(HERO_ROW.state.system).toEqual({
            key: 'd20',
            data: { ext: { retaliation: { used: 0 } } },
        });
    });

    it('a retaliation is given once', () => {
        const run = play(join(HERO_ROW), join(UNIT_ROW));

        expect(run.first?.battleAction).toBeDefined();
        expect(run.second).toBeNull();
    });

    it('rows after the mutation keep the slot with a consistent hash', () => {
        const { after } = play(join(HERO_ROW), join(UNIT_ROW));

        const hero = after.find(
            (p) => p.basicInfo.id === HERO_ID
        ) as BattleParticipant;

        const stored = splitParticipant(hero, place);

        expect(stored.state.system).toEqual({
            key: 'd20',
            data: { ext: { retaliation: { used: 1 } } },
        });
        expect(stored.snapshotHash).toBe(hashJson(stored.snapshot));
    });

    it('the next turn gives the reaction back', () => {
        const { turned } = play(join(HERO_ROW), join(UNIT_ROW));

        const hero = turned.find(
            (p) => p.basicInfo.id === HERO_ID
        ) as BattleParticipant;

        expect(retaliationsUsedOf(hero)).toBe(0);
    });
});
