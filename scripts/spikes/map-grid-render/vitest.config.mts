import { defineConfig, mergeConfig } from 'vitest/config';

import base from '../../../vitest.config.mts';

// separate config: *.spike.* files never join the regular suite
export default mergeConfig(
    base,
    defineConfig({
        test: {
            include: ['scripts/spikes/map-grid-render/**/*.spike.{ts,tsx}'],
            fileParallelism: false,
        },
    })
);
