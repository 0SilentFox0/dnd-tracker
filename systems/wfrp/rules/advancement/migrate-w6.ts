/**
 * W6 migration (legacy +1 model -> canon5e +5 purchases). Decision: the XP a hero put into each
 * characteristic/skill is kept as the budget; points are re-derived as the most canon purchases
 * (step points each) that budget affords, leftover XP is refunded. Points not backed by the ledger
 * (creation bonus, archived history) stay as they are; talent entries, spentArchived and career ticks
 * are untouched. Prices always come from the canon tables (`advancementFor`), never legacy stored brackets.
 * Heroes without a ledger, with ticked/discounted entries, with a career and untracked (possibly
 * out-of-career) entries, with a base that is not a multiple of step, or with negative available XP are
 * left unchanged and reported.
 */
import type { Characteristics, LedgerEntry } from '../characteristics/keys';
import { advancementFor } from './canon';
import { advanceCost } from './cost';
import type { AdvancementRules } from './rules';

export type MigrateStatus =
    | 'converted'
    | 'unchanged'
    | 'no-ledger'
    | 'manual'
    | 'negative-xp';

export type MigrateReport = {
    status: MigrateStatus;
    reason?: string;
    next: Characteristics;
    spentBefore: number;
    spentAfter: number;
    availableBefore: number;
    availableAfter: number;
    changes: {
        kind: 'characteristic' | 'skill';
        key: string;
        from: number;
        to: number;
        refund: number;
    }[];
};

type Track = 'characteristic' | 'skill';

const spentOf = (c: Characteristics) =>
    c.spentArchived + c.ledger.reduce((sum, e) => sum + e.cost, 0);

function rebuild(
    kind: Track,
    key: string,
    entries: LedgerEntry[],
    basePoints: number,
    rules: AdvancementRules,
    step: number,
    nextId: () => string
) {
    const budget = entries.reduce((sum, e) => sum + e.cost, 0);

    const out: LedgerEntry[] = [];

    let points = basePoints;

    let spent = 0;

    for (;;) {
        const cost = advanceCost(kind, points, rules, step);

        if (cost === null || spent + cost > budget) break;

        out.push({
            id: nextId(),
            at: entries[Math.min(out.length, entries.length - 1)].at,
            kind,
            key,
            from: points,
            to: points + step,
            cost,
        });

        points += step;
        spent += cost;
    }

    return { out, points, refund: budget - spent };
}

export function migrateHero(
    experience: number,
    characteristics: Characteristics,
    legacyRules: AdvancementRules,
    step: number
): MigrateReport {
    const c = characteristics;

    const rules = advancementFor(legacyRules, { xpTables: 'canon5e' });

    const spentBefore = spentOf(c);

    const base = {
        spentBefore,
        availableBefore: experience - spentBefore,
        changes: [] as MigrateReport['changes'],
    };

    const result = (
        status: MigrateStatus,
        next: Characteristics,
        reason?: string
    ): MigrateReport => ({
        ...base,
        status,
        reason,
        next,
        spentAfter: spentOf(next),
        availableAfter: experience - spentOf(next),
    });

    if (c.ledger.length === 0) return result('no-ledger', c);

    if (c.ledger.some((e) => e.kind !== 'talent' && (e.tick || e.discount)))
        return result(
            'manual',
            c,
            'ledger has career ticks or training discounts'
        );

    if (c.ledger.some((e) => e.id.startsWith('w6-')))
        return result('unchanged', c, 'already migrated');

    if (c.career && c.ledger.some((e) => e.kind !== 'talent' && !e.tick))
        return result(
            'manual',
            c,
            'hero has a career and ledger entries that may be out-of-career'
        );

    const groups = new Map<string, LedgerEntry[]>();

    for (const e of c.ledger) {
        if (e.kind === 'talent') continue;

        const k = `${e.kind}:${e.key}`;

        groups.set(k, [...(groups.get(k) ?? []), e]);
    }

    const advances = { ...c.advances };

    const skillAdvances = { ...c.skillAdvances };

    const rebuilt: LedgerEntry[] = [];

    let counter = 0;

    const nextId = () => `w6-${++counter}`;

    for (const entries of groups.values()) {
        const kind = entries[0].kind as Track;

        const key = entries[0].key;

        const current =
            kind === 'characteristic'
                ? (c.advances[key as keyof typeof c.advances] ?? 0)
                : (c.skillAdvances[key] ?? 0);

        const ledgerPoints = entries.reduce(
            (sum, e) => sum + (e.to - e.from),
            0
        );

        const basePoints = Math.max(0, current - ledgerPoints);

        if (basePoints % step !== 0)
            return result(
                'manual',
                c,
                `${kind} ${key}: base ${basePoints} is not a multiple of ${step}`
            );

        const { out, points, refund } = rebuild(
            kind,
            key,
            entries,
            basePoints,
            rules,
            step,
            nextId
        );

        rebuilt.push(...out);

        base.changes.push({ kind, key, from: current, to: points, refund });

        if (kind === 'characteristic')
            advances[key as keyof typeof advances] = points;
        else skillAdvances[key] = points;
    }

    const kept = c.ledger.filter((e) => e.kind === 'talent');

    const merged = [...kept, ...rebuilt]
        .map((e, i) => ({ e, i }))
        .sort((a, b) => a.e.at.localeCompare(b.e.at) || a.i - b.i)
        .map(({ e }) => e);

    const next: Characteristics = {
        ...c,
        advances,
        skillAdvances,
        ledger: merged,
    };

    if (experience - spentOf(next) < 0)
        return result('negative-xp', c, 'available XP would be negative');

    return result('converted', next);
}
