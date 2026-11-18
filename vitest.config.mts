import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'node',
        setupFiles: ['./vitest-setup.ts'],
        // Integration tests are excluded from the default run: they need .env.local credentials (pnpm test:integration)
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.next/**',
            '.claude/**',
            '**/*.integration.test.ts',
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['lib/**/*.ts', 'systems/**/*.ts'],
            exclude: [
                'lib/**/*.test.ts',
                'lib/**/__tests__/**',
                'systems/**/__tests__/**',
            ],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
            // Next aliases this itself; vitest needs the same no-op marker module
            'server-only': 'next/dist/compiled/server-only/empty.js',
        },
    },
});
