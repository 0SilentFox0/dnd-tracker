import { describe, expect, it } from 'vitest';

import { context } from '@/lib/server/battles/__tests__/mutations/fixtures';
import { mapDoorToggleMutation } from '@/lib/server/battles/mutations/map-door-toggle/map-door-toggle-mutation';
import { REJECT } from '@/lib/utils/battle/store/reject';
import type { BattleMapConfig } from '@/types/battle-grid';

describe('map-door-toggle on a hex map', () => {
    it('rejects: doors exist only on the square grid', () => {
        const c = context({ isDM: true });

        const map: BattleMapConfig = {
            cols: 8,
            rows: 8,
            background: null,
            opacity: 0.3,
            gridType: 'hex',
            doors: { '3:2:e': { open: false } },
        };

        expect(() =>
            mapDoorToggleMutation(
                { ...c, meta: { ...c.meta, map } },
                { edge: '3:2:e', open: true }
            )
        ).toThrow(expect.objectContaining({ message: REJECT.doorNotFound }));
    });
});
