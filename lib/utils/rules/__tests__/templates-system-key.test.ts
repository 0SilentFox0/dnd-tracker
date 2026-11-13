import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { safeParseRules } from '../schema';

const ROOT = join(process.cwd(), 'data/templates');

const templates = readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

describe('official templates carry a rule system', () => {
    it('lists all templates', () => {
        expect(templates.length).toBeGreaterThanOrEqual(5);
    });

    it.each(templates)('%s has a valid system key', (id) => {
        const raw = JSON.parse(
            readFileSync(join(ROOT, id, 'rules.json'), 'utf8')
        );

        expect(safeParseRules(raw).ok).toBe(true);
    });
});
