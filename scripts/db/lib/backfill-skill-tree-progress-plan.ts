import { jsonEqual } from '@/lib/utils/battle/store/stable-json';
import { isRecord } from '@/lib/utils/common/is-record';

export interface ProgressSourceRow {
    characterId: string;
    columnText: string;
}

export interface ProgressTableRow {
    characterId: string;
    progressText: string;
    version: number;
}

export interface ProgressPlan {
    characterId: string;
    action: 'insert' | 'present' | 'empty' | 'skipped';
    reason?: 'divergent' | 'notObject';
    progressText?: string;
}

const parse = (text: string): unknown => {
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
};

const sameBytes = (a: string, b: string) => {
    if (a === b) return true;

    const x = parse(a);

    const y = parse(b);

    return x !== undefined && y !== undefined && jsonEqual(x, y);
};

/** Inserts only missing table rows from the legacy column; an existing row is never touched, a diverging one is reported */
export function planSkillTreeProgress(
    sources: readonly ProgressSourceRow[],
    existing: readonly ProgressTableRow[]
): ProgressPlan[] {
    const byId = new Map(existing.map((r) => [r.characterId, r]));

    return sources.map(({ characterId, columnText }): ProgressPlan => {
        const parsed = parse(columnText);

        const present = byId.get(characterId);

        if (present)
            return sameBytes(present.progressText, columnText)
                ? { characterId, action: 'present' }
                : { characterId, action: 'skipped', reason: 'divergent' };

        if (!isRecord(parsed))
            return { characterId, action: 'skipped', reason: 'notObject' };

        if (Object.keys(parsed).length === 0)
            return { characterId, action: 'empty' };

        return { characterId, action: 'insert', progressText: columnText };
    });
}

export function summarizeProgress(plans: readonly ProgressPlan[]) {
    const count = (a: ProgressPlan['action']) =>
        plans.filter((p) => p.action === a).length;

    return {
        insert: count('insert'),
        present: count('present'),
        empty: count('empty'),
        skipped: count('skipped'),
        divergent: plans.filter((p) => p.reason === 'divergent').length,
    };
}

export interface ProgressSnapshotRow {
    characterId: string;
    progressText: string;
}

export interface ProgressSnapshot {
    version: 1;
    kind: 'skill-tree-progress';
    createdAt: string;
    host: string;
    database: string;
    rows: ProgressSnapshotRow[];
}

export type ProgressRevertAction = {
    row: ProgressSnapshotRow;
    action: 'delete' | 'missing' | 'conflict';
};

/** Delete only rows still equal to what was inserted (version 1, same bytes); a row written since is a conflict */
export function planProgressRevert(
    snapshot: ProgressSnapshot,
    current: ReadonlyMap<string, ProgressTableRow>
): ProgressRevertAction[] {
    return snapshot.rows.map((row) => {
        const found = current.get(row.characterId);

        if (!found) return { row, action: 'missing' };

        return found.version === 1 &&
            sameBytes(found.progressText, row.progressText)
            ? { row, action: 'delete' }
            : { row, action: 'conflict' };
    });
}

export const formatProgressPlan = (p: ProgressPlan): string[] =>
    p.action === 'insert'
        ? [
              `skill_tree_progress:${p.characterId} · insert from characters.skillTreeProgress`,
          ]
        : p.reason
          ? [`skill_tree_progress:${p.characterId} · skipped (${p.reason})`]
          : [];
