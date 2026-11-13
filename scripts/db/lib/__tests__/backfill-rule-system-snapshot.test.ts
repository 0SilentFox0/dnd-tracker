import { describe, expect, it } from 'vitest';

import {
    parseArgs,
    parseSnapshot,
    revertPlan,
    type RuleSystemSnapshot,
    snapshotFileName,
    type SnapshotRow,
} from '@/scripts/db/lib/backfill-rule-system-snapshot';

const row = (id: string): SnapshotRow => ({
    table: 'campaigns',
    id,
    before: '{}',
    after: '{"system": {"key": "a"}}',
});

const snapshot = (rows: SnapshotRow[]): RuleSystemSnapshot => ({
    version: 1,
    createdAt: '2026-11-13T00:00:00.000Z',
    host: 'localhost',
    database: 'db',
    rows,
});

describe('revertPlan', () => {
    it('classifies every row by the current text', () => {
        const rows = [row('a'), row('b'), row('c'), row('d')];

        const current = new Map([
            ['campaigns:a', rows[0].after],
            ['campaigns:b', rows[1].before],
            ['campaigns:d', '{"edited": true}'],
        ]);

        const plan = revertPlan(snapshot(rows), current);

        expect(plan.map((p) => p.action)).toEqual([
            'restore',
            'alreadyBefore',
            'missing',
            'conflict',
        ]);
        expect(plan[3].current).toBe('{"edited": true}');
    });

    it('keys rows by table and id', () => {
        const plan = revertPlan(
            snapshot([{ ...row('a'), table: 'battle_scenes' }]),
            new Map([['campaigns:a', row('a').after]])
        );

        expect(plan[0].action).toBe('missing');
    });
});

describe('parseSnapshot', () => {
    it('round-trips a valid snapshot', () => {
        const s = snapshot([row('a')]);

        expect(parseSnapshot(JSON.stringify(s))).toEqual(s);
    });

    it.each([
        { ...snapshot([]), version: 2 },
        { ...snapshot([]), rows: 'x' },
        snapshot([{ ...row('a'), table: 'users' as never }]),
        snapshot([{ ...row('a'), after: 1 as never }]),
        null,
    ])('rejects a broken file %#', (data) => {
        expect(() => parseSnapshot(JSON.stringify(data))).toThrow();
    });
});

describe('snapshotFileName', () => {
    it('has no colons', () => {
        const name = snapshotFileName(
            'localhost',
            'prodcopy',
            new Date('2026-11-13T10:20:30.000Z')
        );

        expect(name).toBe('localhost-prodcopy-2026-11-13T10-20-30.000Z.json');
        expect(name).not.toContain(':');
    });
});

describe('parseArgs', () => {
    it('defaults to dry-run', () => {
        expect(parseArgs([])).toEqual({
            mode: 'dry',
            allowRemote: false,
            json: false,
            snapshotDir: '.migration-backup/rule-system',
            skipModules: new Set(),
            force: false,
        });
    });

    it('--apply with common flags', () => {
        const args = parseArgs([
            '--apply',
            '--allow-remote',
            '--json',
            '--snapshot-dir',
            'dir',
        ]);

        expect(args).toMatchObject({
            mode: 'apply',
            allowRemote: true,
            json: true,
            snapshotDir: 'dir',
        });
    });

    it('--revert takes a file', () => {
        expect(parseArgs(['--revert', 'f.json'])).toMatchObject({
            mode: 'revert',
            revertFile: 'f.json',
        });
    });

    it('--force only with --revert', () => {
        expect(() => parseArgs(['--force'])).toThrow();
        expect(parseArgs(['--revert', 'f', '--force']).force).toBe(true);
    });

    it('--apply with --revert', () => {
        expect(() => parseArgs(['--apply', '--revert', 'f'])).toThrow();
    });

    it('unknown option and missing value', () => {
        expect(() => parseArgs(['--nope'])).toThrow();
        expect(() => parseArgs(['--revert'])).toThrow();
        expect(() => parseArgs(['--revert', '--force'])).toThrow();
    });

    it('--skip-modules splits ids', () => {
        expect(parseArgs(['--skip-modules', 'a,b']).skipModules).toEqual(
            new Set(['a', 'b'])
        );
    });
});
