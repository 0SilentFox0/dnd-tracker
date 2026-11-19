import { describe, expect, it } from 'vitest';

import { BattleStatus } from '@/lib/constants/battle';
import { withoutTimedTerrainOnEnd } from '@/lib/utils/battle/pipeline/post-mutation';
import type { MutationResult } from '@/lib/utils/battle/pipeline/run-battle-mutation';
import type { BattleMapConfig } from '@/types/battle-grid';

const map: BattleMapConfig = {
    cols: 8,
    rows: 8,
    background: null,
    opacity: 0.3,
    terrain: {
        '1:1': { kind: 'hazard', untilRound: 100, zoneId: 'z' },
        '2:2': { kind: 'wall' },
    },
    spellZones: {
        z: {
            casterId: 'c',
            spellId: 's',
            spellName: 'Cloudkill',
            side: 'all',
            triggers: {},
            untilRound: 100,
        },
    },
};

const result = (status?: BattleStatus): MutationResult => ({
    participants: [],
    pending: [],
    events: [],
    ...(status && { scene: { status } }),
});

describe('withoutTimedTerrainOnEnd', () => {
    it('drops timed zones and their runtime when the battle completes', () => {
        const out = withoutTimedTerrainOnEnd(
            map,
            BattleStatus.ACTIVE,
            result(BattleStatus.COMPLETED)
        );

        expect(out.scene?.map?.terrain).toEqual({ '2:2': { kind: 'wall' } });
        expect(out.scene?.map?.spellZones).toBeUndefined();
    });

    it('leaves a running battle and an already completed one alone', () => {
        const active = result(BattleStatus.ACTIVE);

        expect(withoutTimedTerrainOnEnd(map, BattleStatus.ACTIVE, active)).toBe(
            active
        );

        const done = result(BattleStatus.COMPLETED);

        expect(
            withoutTimedTerrainOnEnd(map, BattleStatus.COMPLETED, done)
        ).toBe(done);
    });
});
