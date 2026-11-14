import { isRecord } from '@/lib/utils/common/is-record';
import {
    fieldsOf,
    hashMismatch,
    type ParticipantRow,
    type ParticipantShape,
    readSlot,
    shapeOf,
} from '@/scripts/db/lib/battle-state-shapes';

export type StatusFilter = 'active' | 'all';

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
    expectIdle: boolean;
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
        bools: ['--json', '--allow-remote', '--expect-idle'],
        values: ['--status', '--campaign'],
    });

    return {
        status: statusOf(values.get('--status')),
        campaignIds: csv(values.get('--campaign')),
        json: bools.has('--json'),
        allowRemote: bools.has('--allow-remote'),
        expectIdle: bools.has('--expect-idle'),
    };
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

export interface SceneReport {
    scene: SceneRow;
    system: string;
    participants: number;
    pending: number;
    shapes: Record<ParticipantShape, number>;
    fields: Record<string, number>;
    hashMismatch: number;
    legacyMoraleCap: number;
    history: { rows: number; withSlot: number };
    values: {
        id: string;
        shape: ParticipantShape;
        slotKey?: string;
        slot: Record<string, unknown>;
    }[];
}

const emptyShapes = (): Record<ParticipantShape, number> => ({
    none: 0,
    slot: 0,
});

const historyHasSlot = (state: unknown): boolean =>
    isRecord(state) &&
    Array.isArray(state.participants) &&
    state.participants.some(
        (p: unknown) => isRecord(p) && readSlot(p.state) !== undefined
    );

const hasLegacyMoraleCap = (snapshotText: string): boolean => {
    try {
        const snap: unknown = JSON.parse(snapshotText);

        return (
            isRecord(snap) &&
            isRecord(snap.abilities) &&
            snap.abilities.moraleCap !== undefined
        );
    } catch {
        return false;
    }
};

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
            legacyMoraleCap: 0,
            history: {
                rows: hist.length,
                withSlot: hist.filter((h) => historyHasSlot(h.state)).length,
            },
            values: [],
        };

        for (const row of rows) {
            const shape = shapeOf(row);

            const { slotKey, slot } = fieldsOf(row);

            report.shapes[shape]++;

            if (hashMismatch(row)) report.hashMismatch++;

            if (hasLegacyMoraleCap(row.snapshotText)) report.legacyMoraleCap++;

            for (const [name, value] of Object.entries(slot))
                if (isMeaningful(value))
                    report.fields[name] = (report.fields[name] ?? 0) + 1;

            report.values.push({
                id: row.id,
                shape,
                ...(slotKey !== undefined && { slotKey }),
                slot,
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
        .map(([name, count]) => `${name} ${count}`)
        .join(' · ');

    return [
        `${scene.id} «${scene.name}» · ${scene.status} · кампанія «${scene.campaignName}» (${scene.campaignId})`,
        `  система ${r.system} · раунд ${scene.round}, хід ${scene.turnIndex} · version ${scene.version}`,
        `  учасники ${r.participants}${r.pending > 0 ? ` (+резерв ${r.pending})` : ''} · slot ${shapes.slot} · none ${shapes.none}`,
        `  поля слота: ${fields || '—'} · hashMismatch ${r.hashMismatch} · легасі moraleCap ${r.legacyMoraleCap}`,
        `  battle_snapshots ${r.history.rows} (зі слотом ${r.history.withSlot})${pauses.length > 0 ? ` · паузи: ${pauses.join(', ')}` : ''}`,
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
        pausedScenes: reports.filter(
            (r) => r.scene.pendingMorale || r.scene.pendingChoice
        ).length,
        campaigns: new Set(reports.map((r) => r.scene.campaignId)).size,
        shapes,
        hashMismatch: reports.reduce((a, r) => a + r.hashMismatch, 0),
        legacyMoraleCap: reports.reduce((a, r) => a + r.legacyMoraleCap, 0),
    };
}

export const isIdle = (summary: ReturnType<typeof summarizeReports>) =>
    summary.activeScenes + summary.pausedScenes === 0;
