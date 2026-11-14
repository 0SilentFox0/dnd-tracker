import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { keepBattles } from '../battle-sweep/args';
import {
    dbIdentity,
    dropRestoreFile,
    keptRunNotice,
    recoverRules,
    saveRestoreFile,
} from '../battle-sweep/rules-restore';

const DB = 'h:5432/prodcopy_a';

const FILE = `${encodeURIComponent(DB)}__c1.json`;

const dirs: string[] = [];

const tmp = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sweep-restore-'));

    dirs.push(dir);

    return dir;
};

afterEach(() => {
    for (const dir of dirs.splice(0))
        fs.rmSync(dir, { recursive: true, force: true });
});

describe('sweep rules restore file', () => {
    it('recovers the original raw rules of a killed run and removes the file', async () => {
        const dir = tmp();

        saveRestoreFile('c1', { system: { key: 'x' } }, DB, dir);

        const applied: unknown[] = [];

        const restored = await recoverRules(
            async (e) => {
                applied.push(e);
            },
            DB,
            dir
        );

        expect(restored).toEqual(['c1']);
        expect(applied).toEqual([
            { campaignId: 'c1', db: DB, raw: { system: { key: 'x' } } },
        ]);
        expect(fs.readdirSync(dir)).toEqual([]);
    });

    it('keeps the first saved raw and a clean finish leaves nothing to recover', async () => {
        const dir = tmp();

        saveRestoreFile('c1', { a: 1 }, DB, dir);
        saveRestoreFile('c1', { a: 2 }, DB, dir);
        expect(
            JSON.parse(fs.readFileSync(path.join(dir, FILE), 'utf8')).raw
        ).toEqual({ a: 1 });

        dropRestoreFile('c1', DB, dir);
        expect(await recoverRules(async () => {}, DB, dir)).toEqual([]);
    });

    it('leaves the file when apply fails', async () => {
        const dir = tmp();

        saveRestoreFile('c1', null, DB, dir);

        await expect(
            recoverRules(
                async () => {
                    throw new Error('db down');
                },
                DB,
                dir
            )
        ).rejects.toThrow('db down');
        expect(fs.readdirSync(dir)).toEqual([FILE]);
    });

    it('returns nothing when the directory does not exist', async () => {
        expect(
            await recoverRules(async () => {}, DB, path.join(tmp(), 'none'))
        ).toEqual([]);
    });
});

describe('sweep restore is per database', () => {
    it('does not apply or delete a file of another database', async () => {
        const dir = tmp();

        saveRestoreFile('c1', { a: 1 }, 'h:5432/other', dir);

        const applied: unknown[] = [];

        expect(
            await recoverRules(async (e) => void applied.push(e), DB, dir)
        ).toEqual([]);
        expect(applied).toEqual([]);
        expect(fs.readdirSync(dir)).toHaveLength(1);
    });

    it('applies and removes its own file', async () => {
        const dir = tmp();

        saveRestoreFile('c1', { a: 1 }, DB, dir);

        expect(await recoverRules(async () => {}, DB, dir)).toEqual(['c1']);
        expect(fs.readdirSync(dir)).toEqual([]);
    });

    it('skips a legacy file without db and keeps it', async () => {
        const dir = tmp();

        fs.writeFileSync(
            path.join(dir, 'c1.json'),
            JSON.stringify({ campaignId: 'c1', raw: null })
        );

        const applied: unknown[] = [];

        expect(
            await recoverRules(async (e) => void applied.push(e), DB, dir)
        ).toEqual([]);
        expect(applied).toEqual([]);
        expect(fs.readdirSync(dir)).toEqual(['c1.json']);
    });

    it('dbIdentity drops credentials and query', () => {
        expect(dbIdentity('postgresql://u:p@h:5432/prodcopy_a?x=1')).toBe(
            'h:5432/prodcopy_a'
        );
        expect(dbIdentity('')).toBe('unknown');
    });
});

describe('--keep-battles', () => {
    it('parses the flag', () => {
        expect(keepBattles(['--keep-battles'])).toBe(true);
        expect(keepBattles(['--mode', 'sweep'])).toBe(false);
    });

    it('notice names the campaign and the manual cleanup command', () => {
        const text = keptRunNotice(
            { id: 'camp1', templateKey: 'srd' },
            ['h1', 'h2'],
            false
        );

        expect(text).toContain('camp1');
        expect(text).toContain(
            'DELETE FROM battle_scenes WHERE "campaignId" = \'camp1\''
        );
        expect(text).toContain("'h1','h2'");
    });
});
