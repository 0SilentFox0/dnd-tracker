import { existsSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: {} }));

import { SYSTEM_ROUTE_REWRITES } from '@/lib/constants/system-route-rewrites';
import type { SystemServer } from '@/lib/server/systems/types';

const TARGET =
    /^\/api\/campaigns\/:id(?:\/(characters\/:characterId|battles\/:battleId))?\/system\/([a-z][a-z0-9.-]*)(\?.*)?$/;

const scopeOf = (segment: string | undefined) =>
    segment === undefined
        ? 'campaign'
        : segment.startsWith('characters')
          ? 'character'
          : 'battle';

const fileOf = (source: string) =>
    `app${source.replace(/:(\w+)/g, '[$1]')}/route.ts`;

let servers: SystemServer[];

beforeAll(async () => {
    servers = Object.values(
        (await import('@/lib/server/systems/registry')).SYSTEM_SERVER_UNION
    );
}, 30_000);

describe('system route rewrites', () => {
    it('lists at least one rewrite', () => {
        expect(SYSTEM_ROUTE_REWRITES.length).toBeGreaterThan(0);
    });

    it('no rewrite source still has a route file', () => {
        const live = SYSTEM_ROUTE_REWRITES.filter(({ source }) =>
            existsSync(fileOf(source))
        ).map(({ source }) => source);

        expect(live).toEqual([]);
    });

    it('every destination is a general system route', () => {
        const bad = SYSTEM_ROUTE_REWRITES.filter(
            ({ destination }) => !TARGET.test(destination)
        ).map(({ destination }) => destination);

        expect(bad).toEqual([]);
    });

    it('every destination action exists in the composed routes of its scope', () => {
        const missing = SYSTEM_ROUTE_REWRITES.flatMap(({ destination }) => {
            const match = TARGET.exec(destination);

            if (!match) return [];

            const scope = scopeOf(match[1]);

            const action = match[2];

            const found = servers.some((server) =>
                scope === 'battle'
                    ? Object.hasOwn(server.battle ?? {}, action)
                    : Object.hasOwn(server.routes?.[scope] ?? {}, action)
            );

            return found ? [] : [`${scope}: ${action}`];
        });

        expect(missing).toEqual([]);
    });

    it('a query string is only used by campaign-scope destinations', () => {
        const bad = SYSTEM_ROUTE_REWRITES.filter(({ destination }) => {
            const match = TARGET.exec(destination);

            return match?.[3] !== undefined && scopeOf(match[1]) !== 'campaign';
        }).map(({ destination }) => destination);

        expect(bad).toEqual([]);
    });
});
