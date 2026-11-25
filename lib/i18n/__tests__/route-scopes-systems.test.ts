import { describe, expect, it } from 'vitest';

import { type RouteKey, routeNamespaces } from '../route-scopes';
import { isExempt, isSystemReadAllowed } from '../test/route-scope-allow';
import {
    ALWAYS_CORE,
    ENTRIES,
    GRAPHS,
    PAGES,
    systemReads,
} from '../test/system-reads';

describe('system UI reads only namespaces in its route scope', () => {
    for (const { key, moduleIds } of ENTRIES) {
        it.each(PAGES)(`%s (${key})`, (page) => {
            const g = GRAPHS.get(page)!;

            const scope = new Set<string>([
                ...ALWAYS_CORE,
                ...g.declaredRoutes.flatMap((r) =>
                    routeNamespaces(r as RouteKey, { key })
                ),
            ]);

            const bad = systemReads(page, moduleIds)
                .filter(
                    (u) =>
                        !scope.has(u.ns) &&
                        !isSystemReadAllowed(u.ns, u.file) &&
                        (u.kind === 'hook' ||
                            u.kind === 'server' ||
                            !isExempt(u.file, page))
                )
                .map((u) => `${u.ns} (${u.kind}) in ${u.file} via ${u.slot}`);

            expect([...new Set(bad)].sort(), `${page} [${key}]`).toEqual([]);
        });
    }
});
