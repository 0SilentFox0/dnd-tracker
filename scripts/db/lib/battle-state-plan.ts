import { isRecord } from '@/lib/utils/common/is-record';
import { composition } from '@/lib/utils/rules/systems/catalog';
import {
    fieldsOf,
    hashMismatch,
    historyHasLegacy,
    type ParticipantRow,
    type ParticipantShape,
    readSlot,
    shapeOf,
    upgradeHistory,
    upgradeStored,
} from '@/scripts/db/lib/battle-state-shapes';

export type StatusFilter = 'active' | 'all';

export const DEFAULT_SNAPSHOT_DIR = '.migration-backup/battle-state';

export interface SceneRow {
    id: string;
    name: string;
    status: string;
    campaignId: string;
    campaignName: string;
    rules: string | null;
    campaignRules: string | null;
    round: number;
    turnIndex: number;
    version: number;
    pendingMorale: boolean;
    pendingChoice: boolean;
}

export interface StoredRow extends ParticipantRow {
    snapshotText: string;
    stateText: string;
    isPending: boolean;
}

export interface HistoryRow {
    battleId: string;
    seq: number;
    text: string;
    state: unknown;
}

export interface ReportArgs {
    status: StatusFilter;
    campaignIds: string[];
    json: boolean;
    allowRemote: boolean;
    expectClean: boolean;
}

export interface ForwardArgs extends StateArgs {
    revertFile?: string;
}

export interface StateArgs {
    apply: boolean;
    allowRemote: boolean;
    status: StatusFilter;
    sceneIds: string[];
    snapshotDir: string;
    force: boolean;
    json: boolean;
}

interface FlagSpec {
    bools: readonly string[];
    values: readonly string[];
}

function parseFlags(argv: readonly string[], spec: FlagSpec) {
    const bools = new Set<string>();

    const values = new Map<string, string>();

    for (let i = 0; i < argv.length; i++) {
        const flag = argv[i];

        if (spec.bools.includes(flag)) {
            bools.add(flag);

            continue;
        }

        if (!spec.values.includes(flag))
            throw new Error(`Невідома опція: ${flag}`);

        const next = argv[i + 1];

        if (next === undefined || next.startsWith('--'))
            throw new Error(`Опція ${flag} потребує значення`);

        values.set(flag, next);

        i++;
    }

    return { bools, values };
}

const csv = (value: string | undefined): string[] =>
    (value ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

function statusOf(value: string | undefined): StatusFilter {
    if (value === undefined) return 'all';

    if (value !== 'active' && value !== 'all')
        throw new Error('--status: active або all');

    return value;
}

export function parseReportArgs(argv: readonly string[]): ReportArgs {
    const { bools, values } = parseFlags(argv, {
        bools: ['--json', '--allow-remote', '--expect-clean'],
        values: ['--status', '--campaign'],
    });

    return {
        status: statusOf(values.get('--status')),
        campaignIds: csv(values.get('--campaign')),
        json: bools.has('--json'),
        allowRemote: bools.has('--allow-remote'),
        expectClean: bools.has('--expect-clean'),
    };
}

const STATE_BOOLS = ['--apply', '--allow-remote', '--force', '--json'] as const;

const STATE_VALUES = ['--status', '--scene', '--snapshot-dir'] as const;

function stateArgs(bools: Set<string>, values: Map<string, string>): StateArgs {
    return {
        apply: bools.has('--apply'),
        allowRemote: bools.has('--allow-remote'),
        status: statusOf(values.get('--status')),
        sceneIds: csv(values.get('--scene')),
        snapshotDir: values.get('--snapshot-dir') ?? DEFAULT_SNAPSHOT_DIR,
        force: bools.has('--force'),
        json: bools.has('--json'),
    };
}

export function parseForwardArgs(argv: readonly string[]): ForwardArgs {
    const { bools, values } = parseFlags(argv, {
        bools: STATE_BOOLS,
        values: [...STATE_VALUES, '--revert'],
    });

    const revertFile = values.get('--revert');

    if (revertFile !== undefined && bools.has('--apply'))
        throw new Error('--revert не поєднується з --apply');

    return { ...stateArgs(bools, values), revertFile };
}

function systemOf(text: string | null): string | undefined {
    if (!text) return undefined;

    try {
        const rules: unknown = JSON.parse(text);

        const system =
            isRecord(rules) && isRecord(rules.system)
                ? rules.system
                : undefined;

        if (typeof system?.key !== 'string') return undefined;

        const modules = Array.isArray(system.modules)
            ? system.modules.join(',')
            : '';

        return modules ? `${system.key}+${modules}` : system.key;
    } catch {
        return undefined;
    }
}

export const systemLabel = (scene: SceneRow): string =>
    systemOf(scene.rules) ?? systemOf(scene.campaignRules) ?? 'не задано';

function isMeaningful(value: unknown): boolean {
    if (value === undefined || value === null || value === false) return false;

    if (value === 0 || value === '') return false;

    if (Array.isArray(value)) return value.length > 0;

    return isRecord(value) ? Object.keys(value).length > 0 : true;
}

export interface FieldCount {
    slot: number;
    legacy: number;
}

export interface SceneReport {
    scene: SceneRow;
    system: string;
    participants: number;
    pending: number;
    shapes: Record<ParticipantShape, number>;
    fields: Record<string, FieldCount>;
    hashMismatch: number;
    history: { rows: number; withSlot: number; withLegacy: number };
    values: {
        id: string;
        shape: ParticipantShape;
        slotKey?: string;
        slot: Record<string, unknown>;
        legacy: Record<string, unknown>;
    }[];
}

const emptyShapes = (): Record<ParticipantShape, number> => ({
    none: 0,
    legacy: 0,
    slot: 0,
    mixed: 0,
});

const historyHasSlot = (state: unknown): boolean =>
    isRecord(state) &&
    Array.isArray(state.participants) &&
    state.participants.some(
        (p: unknown) => isRecord(p) && readSlot(p.state) !== undefined
    );

export function buildReport(
    scenes: readonly SceneRow[],
    participants: readonly StoredRow[],
    history: readonly HistoryRow[]
): SceneReport[] {
    return scenes.map((scene) => {
        const rows = participants.filter((p) => p.battleId === scene.id);

        const hist = history.filter((h) => h.battleId === scene.id);

        const report: SceneReport = {
            scene,
            system: systemLabel(scene),
            participants: rows.filter((r) => !r.isPending).length,
            pending: rows.filter((r) => r.isPending).length,
            shapes: emptyShapes(),
            fields: {},
            hashMismatch: 0,
            history: {
                rows: hist.length,
                withSlot: hist.filter((h) => historyHasSlot(h.state)).length,
                withLegacy: hist.filter((h) => historyHasLegacy(h.state))
                    .length,
            },
            values: [],
        };

        for (const row of rows) {
            const shape = shapeOf(row);

            const { slotKey, slot, legacy } = fieldsOf(row);

            report.shapes[shape]++;

            if (hashMismatch(row)) report.hashMismatch++;

            for (const [name, value] of Object.entries(slot))
                if (isMeaningful(value))
                    (report.fields[name] ??= { slot: 0, legacy: 0 }).slot++;

            for (const [name, value] of Object.entries(legacy))
                if (isMeaningful(value))
                    (report.fields[name] ??= { slot: 0, legacy: 0 }).legacy++;

            report.values.push({
                id: row.id,
                shape,
                ...(slotKey !== undefined && { slotKey }),
                slot,
                legacy,
            });
        }

        return report;
    });
}

export function formatReport(r: SceneReport): string[] {
    const { scene, shapes } = r;

    const pauses = [
        scene.pendingMorale && 'pendingMoraleCheck',
        scene.pendingChoice && 'pendingChoice',
    ].filter(Boolean);

    const fields = Object.entries(r.fields)
        .map(([name, c]) => `${name} ${c.slot}/${c.legacy}`)
        .join(' · ');

    return [
        `${scene.id} «${scene.name}» · ${scene.status} · кампанія «${scene.campaignName}» (${scene.campaignId})`,
        `  система ${r.system} · раунд ${scene.round}, хід ${scene.turnIndex} · version ${scene.version}`,
        `  учасники ${r.participants}${r.pending > 0 ? ` (+резерв ${r.pending})` : ''} · legacy ${shapes.legacy} · slot ${shapes.slot} · mixed ${shapes.mixed} · none ${shapes.none}`,
        `  поля (слот/старі): ${fields || '—'} · hashMismatch ${r.hashMismatch}`,
        `  battle_snapshots ${r.history.rows} (зі слотом ${r.history.withSlot}, зі старими полями ${r.history.withLegacy})${pauses.length > 0 ? ` · паузи: ${pauses.join(', ')}` : ''}`,
    ];
}

export function summarizeReports(reports: readonly SceneReport[]) {
    const shapes = emptyShapes();

    for (const r of reports)
        for (const key of Object.keys(shapes) as ParticipantShape[])
            shapes[key] += r.shapes[key];

    return {
        scenes: reports.length,
        activeScenes: reports.filter((r) => r.scene.status === 'active').length,
        campaigns: new Set(reports.map((r) => r.scene.campaignId)).size,
        shapes,
        hashMismatch: reports.reduce((a, r) => a + r.hashMismatch, 0),
        historyWithLegacy: reports.reduce(
            (a, r) => a + r.history.withLegacy,
            0
        ),
    };
}

export const isClean = (summary: ReturnType<typeof summarizeReports>) =>
    summary.shapes.legacy + summary.shapes.mixed + summary.historyWithLegacy ===
    0;

export interface ParticipantChange {
    id: string;
    battleId: string;
    before: { snapshot: string; state: string; snapshotHash: string };
    after: { snapshot: unknown; state: unknown; snapshotHash: string };
    unmapped: string[];
}

export interface HistoryChange {
    battleId: string;
    seq: number;
    before: string;
    after: unknown;
    unmapped: string[];
}

export interface StatePlan {
    scenes: { id: string; name: string; version: number }[];
    participants: ParticipantChange[];
    history: HistoryChange[];
    unmapped: string[];
}

export interface ForwardPlan extends StatePlan {
    unresolved: string[];
}

function baseKeyOf(text: string | null): string | undefined {
    if (!text) return undefined;

    try {
        const rules: unknown = JSON.parse(text);

        const system =
            isRecord(rules) && isRecord(rules.system)
                ? rules.system
                : undefined;

        if (typeof system?.key !== 'string') return undefined;

        const modules =
            Array.isArray(system.modules) &&
            system.modules.every((m) => typeof m === 'string')
                ? (system.modules as string[])
                : undefined;

        return composition({ key: system.key, modules }).base;
    } catch {
        return undefined;
    }
}

export const sceneBaseKey = (scene: SceneRow): string | undefined =>
    baseKeyOf(scene.rules) ?? baseKeyOf(scene.campaignRules);

export function planForward(
    scenes: readonly SceneRow[],
    participants: readonly StoredRow[],
    history: readonly HistoryRow[]
): ForwardPlan {
    const bases = new Map(scenes.map((s) => [s.id, sceneBaseKey(s)]));

    const unresolved = new Set<string>();

    const unmapped: string[] = [];

    const participantChanges: ParticipantChange[] = [];

    for (const row of participants) {
        const base = bases.get(row.battleId);

        if (base === undefined) {
            if (shapeOf(row) === 'legacy' || shapeOf(row) === 'mixed')
                unresolved.add(row.battleId);

            continue;
        }

        const result = upgradeStored(row, base);

        unmapped.push(
            ...result.unmapped.map((name) => `participant ${row.id}: ${name}`)
        );

        if (!result.changed) continue;

        participantChanges.push({
            id: row.id,
            battleId: row.battleId,
            before: {
                snapshot: row.snapshotText,
                state: row.stateText,
                snapshotHash: row.snapshotHash,
            },
            after: {
                snapshot: result.snapshot,
                state: result.state,
                snapshotHash: result.snapshotHash,
            },
            unmapped: result.unmapped,
        });
    }

    const historyChanges: HistoryChange[] = [];

    for (const row of history) {
        const base = bases.get(row.battleId);

        if (base === undefined) {
            if (historyHasLegacy(row.state)) unresolved.add(row.battleId);

            continue;
        }

        const result = upgradeHistory(row.state, base);

        unmapped.push(
            ...result.unmapped.map(
                (name) => `history ${row.battleId}#${row.seq}: ${name}`
            )
        );

        if (!result.changed) continue;

        historyChanges.push({
            battleId: row.battleId,
            seq: row.seq,
            before: row.text,
            after: result.state,
            unmapped: result.unmapped,
        });
    }

    const touched = new Set([
        ...participantChanges.map((c) => c.battleId),
        ...historyChanges.map((c) => c.battleId),
    ]);

    return {
        scenes: scenes
            .filter((s) => touched.has(s.id))
            .map((s) => ({ id: s.id, name: s.name, version: s.version })),
        participants: participantChanges,
        history: historyChanges,
        unmapped,
        unresolved: [...unresolved],
    };
}

export function formatPlan(plan: StatePlan | ForwardPlan): string[] {
    const lines = plan.scenes.map((s) => {
        const participants = plan.participants.filter(
            (p) => p.battleId === s.id
        ).length;

        const history = plan.history.filter((h) => h.battleId === s.id).length;

        return `${s.id} «${s.name}» · version ${s.version} → ${s.version + 1} · учасників ${participants} · рядків історії ${history}`;
    });

    for (const name of plan.unmapped) lines.push(`⚠ unmapped ${name}`);

    const unresolved = 'unresolved' in plan ? plan.unresolved : [];

    for (const id of unresolved)
        lines.push(`⚠ unresolved ${id}: база системи не визначена`);

    lines.push(
        `підсумок: сцен ${plan.scenes.length} · учасників ${plan.participants.length} · рядків історії ${plan.history.length} · unmapped ${plan.unmapped.length}${unresolved.length > 0 ? ` · unresolved ${unresolved.length}` : ''}`
    );

    return lines;
}

export interface StateSnapshot {
    version: 1;
    createdAt: string;
    host: string;
    database: string;
    scenes: { id: string; version: number; versionAfter: number }[];
    participants: {
        id: string;
        battleId: string;
        before: { snapshot: string; state: string; snapshotHash: string };
        after: { snapshot: string; state: string; snapshotHash: string };
    }[];
    history: {
        battleId: string;
        seq: number;
        before: string;
        after: string;
    }[];
}

export type StateSnapshotBody = Pick<
    StateSnapshot,
    'scenes' | 'participants' | 'history'
>;

export const snapshotFileName = (
    host: string,
    database: string,
    now: Date,
    suffix = ''
): string =>
    `${host}-${database}-${now.toISOString().replace(/:/g, '-')}${suffix}.json`;
