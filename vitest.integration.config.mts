import path from 'path';
import { defineConfig } from 'vitest/config';

import dotenv from 'dotenv';

// vitest does not parse .env itself
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

export default defineConfig({
    test: {
        environment: 'node',
        include: ['**/*.integration.test.ts'],
        exclude: ['**/node_modules/**', '.claude/**'],
        testTimeout: 30_000,
        hookTimeout: 30_000,
        // serial run so as not to overload the Pusher/Upstash free tier
        // Vitest 4: `poolOptions.forks.singleFork` → `fileParallelism: false`.
        pool: 'forks',
        fileParallelism: false,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
            // Next aliases this itself; vitest needs the same no-op marker module
            'server-only': 'next/dist/compiled/server-only/empty.js',
        },
    },
});
