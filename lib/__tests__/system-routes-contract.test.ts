import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: {} }));

import type { SystemServer } from '@/lib/server/systems/types';

let servers: Readonly<Record<string, SystemServer>>;

beforeAll(async () => {
    servers = (await import('@/lib/server/systems/registry')).SYSTEM_SERVER;
}, 30_000);

describe('system routes contract', () => {
    it('every { operation } route target exists in the operations of the same server', () => {
        const dangling = Object.entries(servers).flatMap(([key, server]) =>
            Object.entries(server.routes ?? {}).flatMap(([scope, routes]) =>
                Object.entries(routes).flatMap(([action, route]) =>
                    Object.entries(route).flatMap(([method, target]) =>
                        target &&
                        'operation' in target &&
                        !Object.hasOwn(
                            server.operations ?? {},
                            target.operation
                        )
                            ? [
                                  `${key} ${scope}/${action} ${method} -> ${target.operation}`,
                              ]
                            : []
                    )
                )
            )
        );

        expect(dangling).toEqual([]);
    });

    it('route keys are plain path segments joined with dots', () => {
        const keys = Object.values(servers).flatMap((server) =>
            Object.values(server.routes ?? {}).flatMap((routes) =>
                Object.keys(routes)
            )
        );

        expect(keys.length).toBeGreaterThan(0);

        for (const key of keys) expect(key).toMatch(/^[a-z][a-z0-9.-]*$/);
    });
});
