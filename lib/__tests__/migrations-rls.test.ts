import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { ROOT } from './helpers/static-graph';

const MIGRATIONS = path.join(ROOT, 'prisma/migrations');

const norm = (name: string) =>
    name.replace(/["`]/g, '').replace(/^public\./, '');

describe('migrations enable RLS', () => {
    it('every CREATE TABLE has ENABLE ROW LEVEL SECURITY for the same table', () => {
        const offenders: string[] = [];

        for (const dir of fs.readdirSync(MIGRATIONS)) {
            const file = path.join(MIGRATIONS, dir, 'migration.sql');

            if (!fs.existsSync(file)) continue;

            const sql = fs.readFileSync(file, 'utf8');

            const created = [
                ...sql.matchAll(
                    /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?((?:"?\w+"?\.)?"?\w+"?)/gi
                ),
            ].map((m) => norm(m[1]));

            const secured = new Set(
                [
                    ...sql.matchAll(
                        /ALTER TABLE\s+(?:ONLY\s+)?((?:"?\w+"?\.)?"?\w+"?)\s+ENABLE ROW LEVEL SECURITY/gi
                    ),
                ].map((m) => norm(m[1]))
            );

            for (const t of created)
                if (!secured.has(t)) offenders.push(`${dir}: ${t}`);
        }

        expect(offenders).toEqual([]);
    });
});
