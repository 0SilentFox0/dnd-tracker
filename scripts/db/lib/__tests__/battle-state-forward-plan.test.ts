import { describe, expect, it } from 'vitest';

import { hashJson } from '@/lib/utils/battle/store/stable-json';
import {
    buildReport,
    formatPlan,
    isClean,
    parseForwardArgs,
    parseReportArgs,
    planForward,
    sceneBaseKey,
    type SceneRow,
    snapshotFileName,
    type StoredRow,
    summarizeReports,
} from '@/scripts/db/lib/battle-state-plan';

const scene = (over: Partial<SceneRow> = {}): SceneRow => ({
    id: 'b1',
    name: 'Бій',
    status: 'active',
    campaignId: 'c1',
    campaignName: 'Кампанія',
    rules: null,
    campaignRules: '{"system":{"key":"homm"}}',
    round: 1,
    turnIndex: 0,
    version: 3,
    pendingMorale: false,
    pendingChoice: false,
    ...over,
});

const stored = (
    id: string,
    battleId: string,
    snapshot: Record<string, unknown>,
    state: Record<string, unknown>
): StoredRow => ({
    id,
    battleId,
    snapshot,
    state,
    snapshotHash: hashJson(snapshot),
    snapshotText: JSON.stringify(snapshot),
    stateText: JSON.stringify(state),
    isPending: false,
});

const legacyRow = (battleId = 'b1') =>
    stored('p1', battleId, { battleData: { inspiration: true } }, {});

describe('sceneBaseKey', () => {
    it('resolves the base from the scene rules, then the campaign rules', () => {
        expect(sceneBaseKey(scene())).toBe('d20');
        expect(
            sceneBaseKey(scene({ rules: '{"system":{"key":"wfrp"}}' }))
        ).toBe('wfrp');
    });

    it('is undefined for missing, broken or unknown systems', () => {
        expect(sceneBaseKey(scene({ campaignRules: null }))).toBeUndefined();
        expect(
            sceneBaseKey(scene({ campaignRules: '{"system":{"key":"nope"}}' }))
        ).toBeUndefined();
        expect(sceneBaseKey(scene({ campaignRules: 'oops' }))).toBeUndefined();
    });
});

describe('planForward', () => {
    it('plans legacy rows and history of resolvable scenes only', () => {
        const history = {
            battleId: 'b1',
            seq: 1,
            text: '{"participants":[{"columns":{"id":"p1"},"state":{"psychologyTested":{}}}]}',
            state: {
                participants: [
                    { columns: { id: 'p1' }, state: { psychologyTested: {} } },
                ],
            },
        };

        const plan = planForward(
            [scene(), scene({ id: 'b2', version: 1 })],
            [
                legacyRow(),
                stored('p9', 'b1', { battleData: {} }, { activeEffects: [] }),
            ],
            [history, { ...history, battleId: 'b2' }]
        );

        expect(plan.scenes.map((s) => s.id)).toEqual(['b1', 'b2']);
        expect(plan.participants.map((p) => p.id)).toEqual(['p1']);
        expect(plan.history.map((h) => `${h.battleId}#${h.seq}`)).toEqual([
            'b1#1',
            'b2#1',
        ]);
        expect(plan.participants[0].after.state).toEqual({
            system: { key: 'd20', data: { inspiration: true } },
        });
        expect(plan.unresolved).toEqual([]);
        expect(planForward([scene()], [], []).scenes).toEqual([]);
    });

    it('is a no-op on already upgraded data', () => {
        const first = planForward([scene()], [legacyRow()], []);

        const [change] = first.participants;

        const after = stored(
            'p1',
            'b1',
            change.after.snapshot as Record<string, unknown>,
            change.after.state as Record<string, unknown>
        );

        const second = planForward([scene()], [after], []);

        expect(second.participants).toEqual([]);
        expect(second.scenes).toEqual([]);
    });

    it('marks scenes without a resolvable base as unresolved and skips them', () => {
        const plan = planForward(
            [scene({ campaignRules: null })],
            [legacyRow()],
            []
        );

        expect(plan.unresolved).toEqual(['b1']);
        expect(plan.participants).toEqual([]);
        expect(formatPlan(plan).join('\n')).toContain('unresolved b1');
    });

    it('does not flag an unresolved scene without legacy data', () => {
        const plan = planForward(
            [scene({ campaignRules: null })],
            [stored('p9', 'b1', { battleData: {} }, {})],
            []
        );

        expect(plan.unresolved).toEqual([]);
    });

    it('collects unmapped slots without writing the row', () => {
        const plan = planForward(
            [scene()],
            [
                stored(
                    'p1',
                    'b1',
                    { battleData: { sin: 1 } },
                    { system: { key: 'other', data: {} } }
                ),
            ],
            []
        );

        expect(plan.participants).toEqual([]);
        expect(plan.unmapped).toEqual(['participant p1: slot.key other']);
    });
});

describe('forward args and clean report', () => {
    it('parses --revert and rejects it together with --apply', () => {
        expect(parseForwardArgs(['--revert', 'f.json'])).toMatchObject({
            revertFile: 'f.json',
            apply: false,
            status: 'all',
        });
        expect(() => parseForwardArgs(['--revert', 'f', '--apply'])).toThrow();
        expect(parseForwardArgs(['--apply', '--force'])).toMatchObject({
            apply: true,
            force: true,
        });
    });

    it('names the forward snapshot file with a suffix', () => {
        expect(snapshotFileName('h', 'db', new Date(0), '-forward')).toBe(
            'h-db-1970-01-01T00-00-00.000Z-forward.json'
        );
    });

    it('isClean needs no legacy, mixed or legacy history rows', () => {
        const legacyHistory = {
            battleId: 'b1',
            seq: 1,
            text: '{}',
            state: {
                participants: [
                    { columns: { id: 'p1' }, state: { retaliationsUsed: 0 } },
                ],
            },
        };

        const summary = (rows: StoredRow[], hist: (typeof legacyHistory)[]) =>
            summarizeReports(buildReport([scene()], rows, hist));

        expect(isClean(summary([], []))).toBe(true);
        expect(isClean(summary([legacyRow()], []))).toBe(false);
        expect(isClean(summary([], [legacyHistory]))).toBe(false);
        expect(summary([], [legacyHistory]).historyWithLegacy).toBe(1);
    });

    it('report accepts --expect-clean', () => {
        expect(parseReportArgs(['--expect-clean']).expectClean).toBe(true);
    });
});
