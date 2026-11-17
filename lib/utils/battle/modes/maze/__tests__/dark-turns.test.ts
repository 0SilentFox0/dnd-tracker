import { describe, expect, it } from 'vitest';

import { modeAutoSkipText } from '@/lib/utils/battle/modes/server';
import type { BattleMapConfig } from '@/types/battle-grid';

describe('maze darkness turn handling', () => {
    it('does not automatically skip the active initiative slot', () => {
        const map = {
            cols: 5,
            rows: 5,
            maze: {
                walls: [],
                exit: null,
                difficulty: 'normal',
                dark: true,
                marks: {},
                moved: false,
                illusionSwap: { pairs: [] },
            },
        } as unknown as BattleMapConfig;

        expect(modeAutoSkipText(map)).toBeNull();
    });
});
