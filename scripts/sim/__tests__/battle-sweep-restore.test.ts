import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { keepBattles } from '../battle-sweep/args';
import {
    dropRestoreFile,
    keptRunNotice,
    recoverRules,
    saveRestoreFile,
} from '../battle-sweep/rules-restore';

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

        saveRestoreFile('c1', { system: { key: 'x' } }, dir);

        const applied: unknown[] = [];

        const restored = await recoverRules(async (e) => {
            applied.push(e);
        }, dir);

        expect(restored).toEqual(['c1']);
        expect(applied).toEqual([
            { campaignId: 'c1', raw: { system: { key: 'x' } } },
        ]);
        expect(fs.readdirSync(dir)).toEqual([]);
    });

    it('keeps the first saved raw and a clean finish leaves nothing to recover', async () => {
        const dir = tmp();

        saveRestoreFile('c1', { a: 1 }, dir);
        saveRestoreFile('c1', { a: 2 }, dir);
        expect(
            JSON.parse(fs.readFileSync(path.join(dir, 'c1.json'), 'utf8')).raw
        ).toEqual({ a: 1 });

        dropRestoreFile('c1', dir);
        expect(await recoverRules(async () => {}, dir)).toEqual([]);
    });

    it('leaves the file when apply fails', async () => {
        const dir = tmp();

        saveRestoreFile('c1', null, dir);

        await expect(
            recoverRules(async () => {
                throw new Error('db down');
            }, dir)
        ).rejects.toThrow('db down');
        expect(fs.readdirSync(dir)).toEqual(['c1.json']);
    });

    it('returns nothing when the directory does not exist', async () => {
        expect(
            await recoverRules(async () => {}, path.join(tmp(), 'none'))
        ).toEqual([]);
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
