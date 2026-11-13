import { existsSync, mkdtempSync, readdirSync,readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { withSnapshotFile } from '@/scripts/db/lib/battle-state-file';

const dir = () => mkdtempSync(join(tmpdir(), 'battle-state-file-'));

describe('withSnapshotFile', () => {
    it('leaves the final file after a successful commit', async () => {
        const d = dir();

        const file = join(d, 'out', 'snap.json');

        const body = await withSnapshotFile(
            file,
            (b: { n: number }) => ({ saved: b.n }),
            async (write) => {
                write({ n: 1 });

                return { n: 1 };
            }
        );

        expect(body).toEqual({ n: 1 });
        expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ saved: 1 });
        expect(existsSync(`${file}.pending`)).toBe(false);
    });

    it('leaves no file when the commit fails after the write', async () => {
        const d = dir();

        const file = join(d, 'snap.json');

        await expect(
            withSnapshotFile(
                file,
                (b: number) => b,
                async (write) => {
                    write(1);

                    throw new Error('commit failed');
                }
            )
        ).rejects.toThrow('commit failed');

        expect(readdirSync(d)).toEqual([]);
    });
});
