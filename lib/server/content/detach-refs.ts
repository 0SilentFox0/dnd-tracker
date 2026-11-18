import { bypassLayer } from '@/lib/db/content-layer';
import { unsafeCast } from '@/lib/utils/common/cast';
import {
    MODULE_CONTENT_TABLES,
    MODULE_DETACH_REFS,
} from '@/lib/utils/rules/systems/content-tables';

type Db = object;

export type DetachKind = string;

type Target = {
    model: string;
    column: string;
    cascade?: boolean;
    viaCharacter?: boolean;
};

const REFERRERS: Record<DetachKind, Target[]> = {
    spellGroup: [{ model: 'spell', column: 'groupId' }],
    race: [{ model: 'unit', column: 'raceId' }],
    unit: [{ model: 'spell', column: 'summonUnitId' }],
};

for (const { kind, ...target } of MODULE_DETACH_REFS)
    (REFERRERS[kind] ??= []).push(target);

/** Bundle table → the reference kind that must be detached when one of its rows is removed. */
export const DETACH_KIND_BY_TABLE: Record<string, DetachKind> = {
    spellGroups: 'spellGroup',
    races: 'race',
    spells: 'spell',
    units: 'unit',
    ...Object.fromEntries(
        MODULE_CONTENT_TABLES.flatMap((t) =>
            t.detach ? [[t.key, t.detach]] : []
        )
    ),
};

/** Content FKs are gone (base rows can be referenced), so the old ON DELETE SET NULL is done here; `ids: "all"` nulls every reference of that kind. */
export async function detachRefs(
    db: Db,
    campaignId: string,
    kind: DetachKind,
    ids: string[] | 'all'
): Promise<void> {
    if (ids !== 'all' && !ids.length) return;

    for (const { model, column, cascade, viaCharacter } of REFERRERS[kind] ??
        []) {
        const match = { [column]: ids === 'all' ? { not: null } : { in: ids } };

        const where = viaCharacter
            ? { ...match, character: { campaignId } }
            : { campaignId, ...match };

        const delegate = unsafeCast<{
            updateMany(args: unknown): Promise<unknown>;
            deleteMany(args: unknown): Promise<unknown>;
        }>(unsafeCast<Record<string, unknown>>(db)[model]);

        await bypassLayer(() =>
            cascade
                ? delegate.deleteMany({ where })
                : delegate.updateMany({ where, data: { [column]: null } })
        );
    }
}
