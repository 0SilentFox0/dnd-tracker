import { isRecord } from '@/lib/utils/common/is-record';
import type { RulesTable } from '@/scripts/db/lib/backfill-rule-modules-plan';

export interface SnapshotRow {
    table: RulesTable;
    id: string;
    before: string;
    after: string;
}

export interface RuleModulesSnapshot {
    version: 1;
    createdAt: string;
    host: string;
    database: string;
    rows: SnapshotRow[];
}

export type RevertAction = {
    row: SnapshotRow;
    action: 'restore' | 'alreadyBefore' | 'missing' | 'conflict';
    current?: string;
};

export const snapshotKey = (row: Pick<SnapshotRow, 'table' | 'id'>) =>
    `${row.table}:${row.id}`;

export function revertPlan(
    s: RuleModulesSnapshot,
    current: ReadonlyMap<string, string>
): RevertAction[] {
    return s.rows.map((row) => {
        const text = current.get(snapshotKey(row));

        if (text === undefined) return { row, action: 'missing' };

        if (text === row.after)
            return { row, action: 'restore', current: text };

        if (text === row.before)
            return { row, action: 'alreadyBefore', current: text };

        return { row, action: 'conflict', current: text };
    });
}

const isRow = (v: unknown): v is SnapshotRow =>
    isRecord(v) &&
    (v.table === 'campaigns' || v.table === 'battle_scenes') &&
    typeof v.id === 'string' &&
    typeof v.before === 'string' &&
    typeof v.after === 'string';

export function parseSnapshot(text: string): RuleModulesSnapshot {
    const data: unknown = JSON.parse(text);

    if (
        !isRecord(data) ||
        data.version !== 1 ||
        typeof data.createdAt !== 'string' ||
        typeof data.host !== 'string' ||
        typeof data.database !== 'string' ||
        !Array.isArray(data.rows) ||
        !data.rows.every(isRow)
    )
        throw new Error('Невалідний файл знімка правил');

    return data as unknown as RuleModulesSnapshot;
}

export function snapshotFileName(
    host: string,
    database: string,
    now: Date
): string {
    return `${host}-${database}-${now.toISOString().replace(/:/g, '-')}.json`;
}

export interface CliArgs {
    mode: 'dry' | 'apply' | 'revert';
    allowRemote: boolean;
    json: boolean;
    snapshotDir: string;
    revertFile?: string;
    force: boolean;
    allowActiveBattles: boolean;
    acknowledgeModuleReadd: boolean;
}

export function assertNoActiveBattles(
    activeBattle: number,
    args: Pick<CliArgs, 'allowActiveBattles'>
) {
    if (activeBattle > 0 && !args.allowActiveBattles)
        throw new Error(
            `Є записи в активних боях (${activeBattle}): завершіть бої або додайте --allow-active-battles`
        );
}

export const DEFAULT_SNAPSHOT_DIR = '.migration-backup/rule-modules';

export function parseArgs(argv: readonly string[]): CliArgs {
    const args: CliArgs = {
        mode: 'dry',
        allowRemote: false,
        json: false,
        snapshotDir: DEFAULT_SNAPSHOT_DIR,
        force: false,
        allowActiveBattles: false,
        acknowledgeModuleReadd: false,
    };

    let apply = false;

    const value = (i: number, flag: string): string => {
        const next = argv[i + 1];

        if (next === undefined || next.startsWith('--'))
            throw new Error(`Опція ${flag} потребує значення`);

        return next;
    };

    for (let i = 0; i < argv.length; i++) {
        const flag = argv[i];

        switch (flag) {
            case '--apply':
                apply = true;
                break;
            case '--allow-remote':
                args.allowRemote = true;
                break;
            case '--json':
                args.json = true;
                break;
            case '--force':
                args.force = true;
                break;
            case '--allow-active-battles':
                args.allowActiveBattles = true;
                break;
            case '--i-know-it-re-adds-modules':
                args.acknowledgeModuleReadd = true;
                break;
            case '--revert':
                args.revertFile = value(i++, flag);
                break;
            case '--snapshot-dir':
                args.snapshotDir = value(i++, flag);
                break;
            default:
                throw new Error(`Невідома опція: ${flag}`);
        }
    }

    if (apply && args.revertFile !== undefined)
        throw new Error('--apply і --revert разом не підтримуються');

    if (args.force && args.revertFile === undefined)
        throw new Error('--force дозволено лише з --revert');

    if (args.allowActiveBattles && !apply)
        throw new Error('--allow-active-battles дозволено лише з --apply');

    if (args.acknowledgeModuleReadd && !apply)
        throw new Error('--i-know-it-re-adds-modules дозволено лише з --apply');

    if (apply && !args.acknowledgeModuleReadd)
        throw new Error(
            'Повторне застосування повертає вимкнені модулі; для підтвердження додайте --i-know-it-re-adds-modules'
        );

    if (apply) args.mode = 'apply';
    else if (args.revertFile !== undefined) args.mode = 'revert';

    return args;
}
