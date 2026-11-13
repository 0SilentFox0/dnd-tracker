import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { moduleCatalog } from '@/lib/utils/rules/systems/catalog';
import { SYSTEM_META } from '@/lib/utils/rules/systems/meta';

const SYSTEMS_DIR = path.join(process.cwd(), 'systems');

describe('module catalog', () => {
    it('covers exactly the systems/* folders that have a meta', () => {
        const folders = fs
            .readdirSync(SYSTEMS_DIR, { withFileTypes: true })
            .filter(
                (d) =>
                    d.isDirectory() &&
                    fs.existsSync(path.join(SYSTEMS_DIR, d.name, 'meta.ts'))
            )
            .map((d) => d.name)
            .sort();

        const catalog = moduleCatalog();

        const ids = new Set([
            ...catalog.bases.map((e) => e.id),
            ...catalog.addons.map((e) => e.id),
            ...SYSTEM_META.filter((m) => m.kind === 'preset').map(
                (m) => m.module
            ),
        ]);

        expect([...ids].sort()).toEqual(folders);
    });
});
