import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/utils/api/actor', () => ({ resolveActor: vi.fn() }));

import { buildOpenApi } from '@/lib/server/content/openapi';
import { CONTENT_RESOURCES } from '@/lib/server/content/resources';

const paths = Object.keys(buildOpenApi().paths);

describe('OpenAPI paths of module-owned content kinds', () => {
    it('every resource, core or module, keeps its collection and item path', () => {
        for (const r of Object.values(CONTENT_RESOURCES)) {
            expect(paths.some((p) => p.endsWith(r.path))).toBe(true);
            expect(
                paths.some((p) => p.endsWith(`${r.path}/{${r.idParam}}`))
            ).toBe(true);
        }
    });

    it('the module kinds are documented', () => {
        for (const kind of [
            'careers',
            'classes',
            'backgrounds',
            'main-skills',
            'skills',
            'artifact-sets',
        ])
            expect(CONTENT_RESOURCES).toHaveProperty(kind);

        expect(paths.some((p) => p.endsWith('/careers'))).toBe(true);
        expect(paths.some((p) => p.endsWith('/main-skills'))).toBe(true);
    });
});
