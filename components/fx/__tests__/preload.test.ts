import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/fx/auras/AuraCanvas', () => {
    throw new Error('ChunkLoadError');
});
vi.mock('@/components/fx/frames/ImpactFrame', () => ({}));
vi.mock('@/components/dice/scene', () => ({}));

import { preloadFx } from '@/components/fx/preload';

describe('preloadFx', () => {
    it('a failed chunk load resolves quietly instead of an unhandled rejection', async () => {
        await expect(preloadFx()).resolves.toBeUndefined();
    });
});
