import { readFileSync } from 'node:fs';
import { join as joinPath } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { CombatStatus } from '@/lib/constants/battle';
import { isDying } from '@/lib/utils/abilities/engine/core/participants';
import { joinParticipant } from '@/lib/utils/battle/store/split-participant';
import { hashJson } from '@/lib/utils/battle/store/stable-json';
import type { StoredParticipant } from '@/lib/utils/battle/store/types';
import { upgradeStored } from '@/scripts/db/lib/battle-state-shapes';
import { d20State } from '@/systems/d20/rules/state';
import { retaliationsUsedOf } from '@/systems/retaliation/rules/state';
import { wfrpState } from '@/systems/wfrp/rules/state';
import type { BattleParticipant } from '@/types/battle';

const ROWS = JSON.parse(
    readFileSync(
        joinPath(
            __dirname,
            '../../../../lib/utils/battle/store/__tests__/fixtures/e2-legacy/homm5-participants.json'
        ),
        'utf8'
    )
) as StoredParticipant[];

const [HERO] = ROWS;

const SAVES = { successes: 1, failures: 2, stable: false };

function withLegacy(
    battleData: Record<string, unknown>,
    state: Record<string, unknown>
): StoredParticipant {
    const { retaliationsUsed: _skip, ...baseState } = HERO.state;

    const snapshot = {
        ...HERO.snapshot,
        battleData: {
            ...(HERO.snapshot.battleData as Record<string, unknown>),
            ...battleData,
        },
    };

    return {
        ...HERO,
        snapshot,
        snapshotHash: hashJson(snapshot),
        state: { ...baseState, ...state },
    } as StoredParticipant;
}

function forward(row: StoredParticipant, base: string): StoredParticipant {
    const result = upgradeStored(row, base);

    return {
        ...row,
        snapshot: result.snapshot,
        state: result.state,
        snapshotHash: result.snapshotHash,
    } as StoredParticipant;
}

const join = (row: StoredParticipant): BattleParticipant =>
    joinParticipant(row, 'b1');

const unconscious = (p: BattleParticipant): BattleParticipant => ({
    ...p,
    combatStats: { ...p.combatStats, status: CombatStatus.UNCONSCIOUS },
});

const reads = (p: BattleParticipant) => ({
    d20: d20State(p),
    retaliation: retaliationsUsedOf(p),
    wfrp: wfrpState(p),
    dying: isDying(unconscious(p)),
});

beforeAll(async () => {
    await import('@/lib/utils/rules/systems/registry');
}, 30_000);

describe('forward keeps what the readers see', () => {
    it('HOMM5 hero with the flat retaliation counter (golden)', () => {
        const row = ROWS[0];

        const after = forward(row, 'd20');

        expect(HERO.state.retaliationsUsed).toBe(0);
        expect(after.state.system).toEqual({
            key: 'd20',
            data: { ext: { retaliation: { used: 0 } } },
        });
        expect('retaliationsUsed' in after.state).toBe(false);
        expect(after.snapshotHash).toBe(hashJson(after.snapshot));
        expect(reads(join(after))).toEqual({
            d20: {},
            retaliation: 0,
            wfrp: {},
            dying: false,
        });
    });

    it('every HOMM5 fixture row reads the same before and after (dual-read equivalence)', () => {
        for (const row of ROWS) {
            const before = reads(join(row));

            expect(reads(join(forward(row, 'd20')))).toEqual(before);
        }
    });

    it('d20 death saves, inspiration and light flags (golden)', () => {
        const row = withLegacy(
            {
                deathSaves: SAVES,
                inspiration: true,
                inspirationSpent: true,
                attackedWithLight: true,
            },
            { retaliationsUsed: 2 }
        );

        const expected = {
            d20: {
                deathSaves: SAVES,
                inspiration: true,
                inspirationSpent: true,
                attackedWithLight: true,
            },
            retaliation: 2,
            wfrp: {},
            dying: true,
        };

        expect(reads(join(row))).toEqual(expected);
        expect(reads(join(forward(row, 'd20')))).toEqual(expected);
    });

    it('wfrp fortune, channelling, sin, tests and psychology (golden)', () => {
        const row = withLegacy(
            {
                fortune: 2,
                channelledSl: 1,
                sin: 0,
                conditionTests: ['bleeding'],
            },
            { psychologyTested: { fear: 1 } }
        );

        const expected = {
            d20: {},
            retaliation: undefined,
            wfrp: {
                fortune: 2,
                channelledSl: 1,
                sin: 0,
                conditionTests: ['bleeding'],
                psychologyTested: { fear: 1 },
            },
            dying: false,
        };

        expect(reads(join(row))).toEqual(expected);
        expect(reads(join(forward(row, 'wfrp')))).toEqual(expected);
    });

    it('mixed row: the slot wins and the stale flat copy is gone', () => {
        const row = withLegacy(
            { inspiration: true },
            {
                retaliationsUsed: 0,
                system: {
                    key: 'd20',
                    data: { deathSaves: SAVES },
                },
                dying: true,
            }
        );

        const before = reads(join(row));

        const after = reads(join(forward(row, 'd20')));

        expect(before.d20).toEqual({ deathSaves: SAVES });
        expect(after).toEqual({ ...before, retaliation: 0 });
        expect(after.dying).toBe(true);
    });
});
