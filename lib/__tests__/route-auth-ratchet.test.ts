import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { ROOT, staticGraph } from './helpers/static-graph';

const API_DIR = path.join(ROOT, 'app/api');

// reaching one of these means the route (or a handler it delegates to) can authenticate the caller
const AUTH_PROVIDERS = new Set([
    'lib/auth.ts',
    'lib/utils/api/api-auth.ts',
    'lib/utils/api/actor.ts',
    'lib/utils/api/as-dm.ts',
]);

// public by design; this list may only shrink
const PUBLIC_ROUTES = new Set([
    'app/api/health/route.ts',
    'app/api/openapi.json/route.ts',
    'app/api/csp-report/route.ts',
    'app/api/cron/assistant-cleanup/route.ts',
]);

const SECRET_GUARD = /CRON_SECRET|HEALTH_SECRET/;

function routeFiles(dir: string): string[] {
    return fs
        .readdirSync(dir, { withFileTypes: true })
        .flatMap((e) =>
            e.isDirectory()
                ? e.name === '__tests__'
                    ? []
                    : routeFiles(path.join(dir, e.name))
                : e.name === 'route.ts'
                  ? [path.join(dir, e.name)]
                  : []
        );
}

const routes = routeFiles(API_DIR).map((f) => path.relative(ROOT, f));

describe('route auth ratchet', () => {
    it('every non-public route reaches an auth provider', () => {
        const offenders = routes
            .filter((r) => !PUBLIC_ROUTES.has(r))
            .filter((r) => {
                const { files } = staticGraph([r], AUTH_PROVIDERS);

                return ![...files].some((f) => AUTH_PROVIDERS.has(f));
            });

        expect(offenders).toEqual([]);
    }, 60_000);

    it('public routes still exist and are not stale', () => {
        for (const r of PUBLIC_ROUTES) expect(routes).toContain(r);
    });

    it('cron routes check a secret', () => {
        const cron = routes.filter((r) => r.startsWith('app/api/cron/'));

        for (const r of cron) {
            const { files } = staticGraph([r]);

            const guarded = [...files].some((f) =>
                SECRET_GUARD.test(fs.readFileSync(path.join(ROOT, f), 'utf8'))
            );

            expect(guarded, r).toBe(true);
        }
    });
});
