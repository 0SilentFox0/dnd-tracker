import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    importSpecs,
    resolveSpec,
    ROOT,
    staticGraph,
} from './helpers/static-graph';

const API_DIR = path.join(ROOT, 'app/api');

const AUTH_CALLS = [
    'requireAuth',
    'requireAuthUser',
    'requireCampaignAccess',
    'requireDM',
    'requireCampaignDMOrDemoAccess',
    'getAuthUser',
    'getAuthUserOptional',
    'getSessionUserId',
    'getClaims',
    'verifyBearer',
    'authenticateToken',
    'resolveActor',
    'withAccess',
    'withDM',
    'withDMOrDemo',
    'verifyApiToken',
    'requirePlatformAdmin',
    'operationAccess',
    'operationDM',
    // character operations require a `gate` in their type, run before the handler
    'characterHandler',
    'characterRoute',
    'executeCharacterRoute',
    'runCharacterOperation',
];

const AUTH_CALL_RE = new RegExp(`\\b(?:${AUTH_CALLS.join('|')})\\b`);

const MAX_DEPTH = 2;

// the route or a local module within MAX_DEPTH imports must use an auth function (a call, or one injected as a dependency)
function callsAuth(route: string): boolean {
    let frontier = [path.join(ROOT, route)];

    const seen = new Set(frontier);

    for (let depth = 0; depth <= MAX_DEPTH; depth++) {
        const next: string[] = [];

        for (const file of frontier) {
            const source = fs.readFileSync(file, 'utf8');

            if (AUTH_CALL_RE.test(source)) return true;

            for (const spec of importSpecs(source)) {
                const local = resolveSpec(file, spec);

                if (!local || seen.has(local)) continue;

                if (path.basename(local).startsWith('index.')) continue;

                seen.add(local);
                next.push(local);
            }
        }

        frontier = next;
    }

    return false;
}

// public by design; this list may only shrink
const PUBLIC_ROUTES = new Set([
    'app/api/health/route.ts',
    'app/api/openapi.json/route.ts',
    'app/api/csp-report/route.ts',
    'app/api/cron/assistant-cleanup/route.ts',
    'app/api/ops/collect/route.ts',
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
    it('every non-public route calls an auth function (depth <= 2)', () => {
        const offenders = routes
            .filter((r) => !PUBLIC_ROUTES.has(r))
            .filter((r) => !callsAuth(r));

        expect(offenders).toEqual([]);
    });

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
