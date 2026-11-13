import { describe, expect, it } from 'vitest';

import { hashJson } from '@/lib/utils/battle/store/stable-json';
import {
    buildReport,
    formatReport,
    parseReportArgs,
    type SceneRow,
    snapshotFileName,
    type StoredRow,
    summarizeReports,
    systemLabel,
} from '@/scripts/db/lib/battle-state-plan';

const scene = (over: Partial<SceneRow> = {}): SceneRow => ({
    id: 'b1',
    name: 'Бій',
    status: 'active',
    campaignId: 'c1',
    campaignName: 'Кампанія',
    rules: null,
    campaignRules: null,
    round: 2,
    turnIndex: 1,
    version: 7,
    pendingMorale: false,
    pendingChoice: false,
    ...over,
});

const stored = (
    id: string,
    snapshot: Record<string, unknown>,
    state: Record<string, unknown>,
    isPending = false
): StoredRow => ({
    id,
    battleId: 'b1',
    snapshot,
    state,
    snapshotHash: hashJson(snapshot),
    snapshotText: JSON.stringify(snapshot),
    stateText: JSON.stringify(state),
    isPending,
});

const legacy = () =>
    stored('p1', { battleData: { fortune: 2 } }, { activeEffects: [] });

const slot = () =>
    stored(
        'p2',
        { battleData: {} },
        { system: { key: 'sys', data: { fortune: 1, sin: 0 } } }
    );

describe('parse args', () => {
    it('report defaults to all statuses', () =>
        expect(parseReportArgs([])).toEqual({
            status: 'all',
            campaignIds: [],
            json: false,
            allowRemote: false,
            expectClean: false,
        }));

    it('report reads values and flags', () =>
        expect(
            parseReportArgs(['--status', 'all', '--campaign', 'a, b', '--json'])
        ).toMatchObject({
            status: 'all',
            campaignIds: ['a', 'b'],
            json: true,
        }));

    it('rejects unknown options, bad status and missing values', () => {
        expect(() => parseReportArgs(['--nope'])).toThrow('Невідома опція');
        expect(() => parseReportArgs(['--status', 'x'])).toThrow('--status');
        expect(() => parseReportArgs(['--campaign'])).toThrow('потребує');
    });
});

describe('systemLabel', () => {
    it('prefers the scene snapshot, then the campaign, with modules', () => {
        const rules = JSON.stringify({
            system: { key: 'a', modules: ['m', 'n'] },
        });

        expect(systemLabel(scene({ rules }))).toBe('a+m,n');
        expect(
            systemLabel(scene({ campaignRules: '{"system":{"key":"c"}}' }))
        ).toBe('c');
        expect(systemLabel(scene({ rules: 'oops' }))).toBe('не задано');
    });
});

describe('buildReport', () => {
    const reports = () =>
        buildReport(
            [scene()],
            [legacy(), slot(), stored('p3', { battleData: {} }, {}, true)],
            [
                {
                    battleId: 'b1',
                    seq: 1,
                    text: '{}',
                    state: {
                        participants: [
                            { state: { system: { key: 'sys', data: {} } } },
                        ],
                    },
                },
                { battleId: 'b1', seq: 2, text: '{}', state: {} },
            ]
        );

    it('counts shapes, reserve, history and meaningful fields', () => {
        const [r] = reports();

        expect(r.participants).toBe(2);
        expect(r.pending).toBe(1);
        expect(r.shapes).toEqual({ none: 1, legacy: 1, slot: 1, mixed: 0 });
        expect(r.fields).toEqual({ fortune: { slot: 1, legacy: 1 } });
        expect(r.history).toEqual({ rows: 2, withSlot: 1, withLegacy: 0 });
        expect(r.hashMismatch).toBe(0);
    });

    it('counts hash mismatches', () => {
        const row = { ...legacy(), snapshotHash: 'bad' };

        const [r] = buildReport([scene()], [row], []);

        expect(r.hashMismatch).toBe(1);
    });

    it('carries per participant values for --json', () => {
        const [r] = reports();

        expect(r.values[1]).toMatchObject({
            id: 'p2',
            shape: 'slot',
            slotKey: 'sys',
            slot: { fortune: 1, sin: 0 },
        });
    });

    it('formats lines with pauses and summarizes', () => {
        const [r] = buildReport(
            [scene({ pendingChoice: true })],
            [legacy()],
            []
        );

        const text = formatReport(r).join('\n');

        expect(text).toContain('pendingChoice');
        expect(text).toContain('version 7');
        expect(text).toContain('fortune 0/1');

        expect(summarizeReports(reports())).toMatchObject({
            scenes: 1,
            activeScenes: 1,
            campaigns: 1,
            shapes: { none: 1, legacy: 1, slot: 1, mixed: 0 },
        });
    });
});

describe('snapshotFileName', () => {
    it('has no colons', () =>
        expect(
            snapshotFileName(
                'localhost',
                'db',
                new Date('2026-11-13T10:20:30Z')
            )
        ).toBe('localhost-db-2026-11-13T10-20-30.000Z.json'));
});
