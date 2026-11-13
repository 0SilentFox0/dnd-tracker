import { Prisma, type PrismaClient } from '@prisma/client';

import { BattleStatus } from '@/lib/constants/battle';
import {
    type CampaignFacts,
    type RowPlan,
    type RulesRow,
    type RulesTable,
} from '@/scripts/db/lib/backfill-rule-system-plan';
import {
    type RevertAction,
    revertPlan,
    type RuleSystemSnapshot,
    snapshotKey,
    type SnapshotRow,
} from '@/scripts/db/lib/backfill-rule-system-snapshot';

export interface RawDb {
    $queryRaw<T = unknown>(query: Prisma.Sql): Promise<T>;
    $transaction<T>(
        fn: (tx: RawDb) => Promise<T>,
        options?: { timeout?: number; maxWait?: number }
    ): Promise<T>;
}

export type LayeredDb = Pick<
    PrismaClient,
    | 'artifactSet'
    | 'skillTree'
    | 'skill'
    | 'mainSkill'
    | 'gameClass'
    | 'character'
    | 'battleScene'
>;

const TX_OPTIONS = { timeout: 120_000, maxWait: 20_000 };

export async function loadRows(db: RawDb): Promise<RulesRow[]> {
    const campaigns = await db.$queryRaw<
        {
            id: string;
            name: string;
            kind: string;
            createdFromId: string | null;
            text: string;
        }[]
    >(
        Prisma.sql`SELECT id, name, kind, "createdFromId", rules::text AS text FROM campaigns ORDER BY "createdAt", id`
    );

    const scenes = await db.$queryRaw<
        { id: string; campaignId: string; status: string; text: string }[]
    >(
        Prisma.sql`SELECT id, "campaignId", status, rules::text AS text FROM battle_scenes WHERE rules IS NOT NULL ORDER BY "createdAt", id`
    );

    return [
        ...campaigns.map(
            (c): RulesRow => ({
                table: 'campaigns',
                id: c.id,
                campaignId: c.id,
                label: c.name,
                kind: c.kind,
                createdFromId: c.createdFromId,
                text: c.text,
            })
        ),
        ...scenes.map(
            (s): RulesRow => ({
                table: 'battle_scenes',
                id: s.id,
                campaignId: s.campaignId,
                label: s.status,
                status: s.status,
                text: s.text,
            })
        ),
    ];
}

export async function loadFacts(
    db: LayeredDb,
    campaignIds: readonly string[]
): Promise<Map<string, CampaignFacts>> {
    const ids = [...new Set(campaignIds)];

    const characters = await db.character.findMany({
        where: { campaignId: { in: ids } },
        select: {
            id: true,
            campaignId: true,
            name: true,
            level: true,
            class: true,
            classes: true,
            archetype: true,
            skillTreeProgress: true,
            personalSkillId: true,
        },
    });

    const active = new Set(
        (
            await db.battleScene.findMany({
                where: {
                    campaignId: { in: ids },
                    status: BattleStatus.ACTIVE,
                },
                select: { campaignId: true },
            })
        ).map((s) => s.campaignId)
    );

    const facts = new Map<string, CampaignFacts>();

    for (const campaignId of ids) {
        const where = { campaignId };

        const classes = await db.gameClass.findMany({
            where,
            select: { id: true },
        });

        facts.set(campaignId, {
            artifactSets: await db.artifactSet.count({ where }),
            skillTrees: await db.skillTree.count({ where }),
            skills: await db.skill.count({ where }),
            mainSkills: await db.mainSkill.count({ where }),
            characters: characters.filter((c) => c.campaignId === campaignId),
            classIds: classes.map((c) => c.id),
            activeBattle: active.has(campaignId),
        });
    }

    return facts;
}

const updateRules = (
    tx: RawDb,
    table: RulesTable,
    id: string,
    next: string,
    expected: string
): Promise<{ text: string }[]> =>
    table === 'campaigns'
        ? tx.$queryRaw(
              Prisma.sql`UPDATE campaigns SET rules = ${next}::jsonb WHERE id = ${id} AND rules::text = ${expected} RETURNING rules::text AS text`
          )
        : tx.$queryRaw(
              Prisma.sql`UPDATE battle_scenes SET rules = ${next}::jsonb WHERE id = ${id} AND rules::text = ${expected} RETURNING rules::text AS text`
          );

const rowChanged = (table: RulesTable, id: string) =>
    new Error(`${table} ${id}: рядок змінився з часу читання`);

export async function applyPlans(
    db: RawDb,
    plans: readonly RowPlan[],
    write: (rows: SnapshotRow[]) => void
): Promise<SnapshotRow[]> {
    const targets = plans.filter((p) => p.action === 'write' && p.afterJson);

    if (targets.length === 0) return [];

    return db.$transaction(async (tx) => {
        const rows: SnapshotRow[] = [];

        for (const plan of targets) {
            const { table, id } = plan.row;

            const [updated] = await updateRules(
                tx,
                table,
                id,
                JSON.stringify(plan.afterJson),
                plan.beforeText
            );

            if (!updated) throw rowChanged(table, id);

            rows.push({
                table,
                id,
                before: plan.beforeText,
                after: updated.text,
            });
        }

        write(rows);

        return rows;
    }, TX_OPTIONS);
}

export async function currentTexts(
    db: RawDb,
    rows: readonly SnapshotRow[]
): Promise<Map<string, string>> {
    const byTable = (table: RulesTable) =>
        rows.filter((r) => r.table === table).map((r) => r.id);

    const result = new Map<string, string>();

    const campaignIds = byTable('campaigns');

    const sceneIds = byTable('battle_scenes');

    if (campaignIds.length > 0)
        for (const r of await db.$queryRaw<{ id: string; text: string }[]>(
            Prisma.sql`SELECT id, rules::text AS text FROM campaigns WHERE id IN (${Prisma.join(campaignIds)})`
        ))
            result.set(snapshotKey({ table: 'campaigns', id: r.id }), r.text);

    if (sceneIds.length > 0)
        for (const r of await db.$queryRaw<{ id: string; text: string }[]>(
            Prisma.sql`SELECT id, rules::text AS text FROM battle_scenes WHERE rules IS NOT NULL AND id IN (${Prisma.join(sceneIds)})`
        ))
            result.set(
                snapshotKey({ table: 'battle_scenes', id: r.id }),
                r.text
            );

    return result;
}

export async function revertSnapshot(
    db: RawDb,
    s: RuleSystemSnapshot,
    force: boolean
): Promise<{ restored: number; skipped: RevertAction[] }> {
    return db.$transaction(async (tx) => {
        const actions = revertPlan(s, await currentTexts(tx, s.rows));

        const conflicts = actions.filter((a) => a.action === 'conflict');

        if (conflicts.length > 0 && !force)
            throw new Error(
                `Конфлікт: ${conflicts.map((c) => snapshotKey(c.row)).join(', ')} змінено після застосування (--force лише за рішенням власника)`
            );

        let restored = 0;

        for (const { row, action, current } of actions) {
            if (action !== 'restore' && action !== 'conflict') continue;

            const [updated] = await updateRules(
                tx,
                row.table,
                row.id,
                row.before,
                current ?? row.after
            );

            if (!updated) throw rowChanged(row.table, row.id);

            if (updated.text !== row.before)
                throw new Error(
                    `${row.table} ${row.id}: після відновлення текст не збігається зі знімком`
                );

            restored++;
        }

        return {
            restored,
            skipped: actions.filter(
                (a) => a.action === 'alreadyBefore' || a.action === 'missing'
            ),
        };
    }, TX_OPTIONS);
}
