import { describe, expect, it } from 'vitest';

import { allMapModes } from '../registry';

describe('mode grid capability', () => {
    it('maze supports only the square grid', () => {
        const maze = allMapModes().find((m) => m.key === 'maze');

        expect(maze?.grids).toEqual(['square']);
    });
});
