#!/usr/bin/env tsx
/**
 * Moves already seeded grim spells to the current spell-damage schema (SPELL_POWER: flat damageBonus, casting.magic.missile/ignore/scale).
 * Only campaigns whose rule base is wfrp. A spell is rewritten only while it still equals its pre-power template row; edited rows are reported, never overwritten. sourceHash is not touched.
 * Dry run by default; --apply refuses while an affected campaign has an active battle, writes with a compare-and-swap on the six columns and saves a snapshot for --revert.
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/templates/systems/wfrp/backfill-spell-missile.ts [--apply] [--allow-remote] [--snapshot-dir <dir>]
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/templates/systems/wfrp/backfill-spell-missile.ts --revert <file> [--force] [--allow-remote]
 */
import { Prisma } from '@prisma/client';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import oldRows from './backfill-spell-missile-old.json';
import {
    type DbSpell,
    differingColumns,
    formatSpellPlan,
    normalizeTemplateRow,
    parseSpellSnapshot,
    planSpellMissile,
    type SpellColumns,
    type SpellSnapshot,
    type SpellSnapshotRow,
    summarizeSpellPlans,
} from './backfill-spell-missile-plan';

import '@/lib/utils/rules/systems/registry';
import { isRecord } from '@/lib/utils/common/is-record';
import { PRESETS } from '@/lib/utils/rules/systems/catalog';
import {
    extSnapshotFileName,
    writeSnapshotAtomically,
} from '@/scripts/db/lib/backfill-ext-common';
import {
    activeBattleCampaigns,
    EXT_TX_OPTIONS,
} from '@/scripts/db/lib/backfill-ext-db';
import type { RawDb } from '@/scripts/db/lib/raw-db';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

const WFRP_BASE = 'wfrp';

const TEMPLATE = fileURLToPath(
    new URL('../../../../data/templates/grim-d100/spells.json', import.meta.url)
);

function flag(argv: readonly string[], name: string): string | undefined {
    const i = argv.indexOf(name);

    if (i < 0) return undefined;

    const next = argv[i + 1];

    if (next === undefined || next.startsWith('--'))
        throw new Error(`Option ${name} requires a value`);

    return next;
}

const casSql = (id: string, c: SpellColumns, tx: Prisma.Sql = Prisma.empty) =>
    Prisma.sql`id = ${id} AND dice = ${c.dice} AND "damageBonus" IS NOT DISTINCT FROM ${c.damageBonus} AND "executionMode" = ${c.executionMode} AND casting IS NOT DISTINCT FROM ${JSON.stringify(c.casting)}::jsonb AND targeting = ${JSON.stringify(c.targeting)}::jsonb AND "spellEffects" = ${JSON.stringify(c.spellEffects)}::jsonb ${tx}`;

async function writeColumns(
    tx: RawDb,
    id: string,
    expected: SpellColumns,
    next: SpellColumns
): Promise<boolean> {
    const rows = await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`UPDATE spells SET dice = ${next.dice}, "damageBonus" = ${next.damageBonus}, "executionMode" = ${next.executionMode}, casting = ${JSON.stringify(next.casting)}::jsonb, targeting = ${JSON.stringify(next.targeting)}::jsonb, "spellEffects" = ${JSON.stringify(next.spellEffects)}::jsonb WHERE ${casSql(id, expected)} RETURNING id`
    );

    return rows.length === 1;
}

async function revert(
    db: RawDb,
    snapshot: SpellSnapshot,
    force: boolean,
    where: string
) {
    let restored = 0;

    for (const r of snapshot.rows) {
        const [current] = await db.$queryRaw<(SpellColumns & { id: string })[]>(
            Prisma.sql`SELECT id, dice, "damageBonus", "executionMode", casting, targeting, "spellEffects" FROM spells WHERE id = ${r.id}`
        );

        if (!current) {
            console.log(`warning ${r.id}: row is gone`);
            continue;
        }

        if (differingColumns(current, r.before).length === 0) continue;

        if (!force && differingColumns(current, r.after).length > 0) {
            console.log(`warning ${r.id}: edited since the backfill, skipped`);
            continue;
        }

        if (await writeColumns(db, r.id, current, r.before)) restored++;
    }

    console.log(
        `${where} · REVERT · restored ${restored}/${snapshot.rows.length}`
    );
}

async function main() {
    const argv = process.argv.slice(2);

    const apply = argv.includes('--apply');

    const revertFile = flag(argv, '--revert');

    if (apply && revertFile !== undefined)
        throw new Error('--apply and --revert are mutually exclusive');

    const snapshotDir =
        flag(argv, '--snapshot-dir') ?? '.migration-backup/spell-missile';

    const host = assertSeedTarget(
        process.env.DATABASE_URL,
        argv.includes('--allow-remote')
    );

    const database = new URL(process.env.DATABASE_URL ?? '').pathname.slice(1);

    const where = `DB: ${host}/${database}`;

    const { prisma } = await import('@/lib/db');

    const db = prisma as unknown as RawDb;

    try {
        if (revertFile !== undefined) {
            await revert(
                db,
                parseSpellSnapshot(readFileSync(revertFile, 'utf8')),
                argv.includes('--force'),
                where
            );

            return;
        }

        const template = JSON.parse(readFileSync(TEMPLATE, 'utf8')) as Record<
            string,
            unknown
        >[];

        const targets = Object.fromEntries(
            template.map((r) => [String(r.name), normalizeTemplateRow(r)])
        );

        const campaigns = await prisma.campaign.findMany({
            select: { id: true, rules: true },
        });

        const ids = campaigns
            .filter((c) => {
                const system = isRecord(c.rules) ? c.rules.system : undefined;

                const key =
                    isRecord(system) && typeof system.key === 'string'
                        ? system.key
                        : undefined;

                return key !== undefined && PRESETS[key]?.base === WFRP_BASE;
            })
            .map((c) => c.id);

        const spells = await prisma.spell.findMany({
            where: { campaignId: { in: ids } },
            select: {
                id: true,
                campaignId: true,
                name: true,
                dice: true,
                damageBonus: true,
                casting: true,
                executionMode: true,
                targeting: true,
                spellEffects: true,
            },
            orderBy: [{ campaignId: 'asc' }, { name: 'asc' }],
        });

        const plans = planSpellMissile(
            spells as DbSpell[],
            targets,
            oldRows as unknown as Record<string, SpellColumns | SpellColumns[]>
        );

        const active = await activeBattleCampaigns(db);

        const summary = summarizeSpellPlans(plans, active);

        console.log(
            `${where} · ${apply ? 'APPLY' : 'DRY RUN'} · wfrp campaigns ${ids.length} · listed spell rows ${plans.length}`
        );

        for (const p of plans)
            if (p.action !== 'current') console.log(formatSpellPlan(p));

        console.log(
            `summary: write ${summary.write} (active-battle campaigns ${summary.activeBattle}) · current ${summary.current} · divergent ${summary.divergent}`
        );

        if (!apply) return;

        if (summary.activeBattle > 0)
            throw new Error(
                `Spells in campaigns with active battles (${summary.activeBattle}): finish the battles first`
            );

        const targetsToWrite = plans.filter((p) => p.action === 'write');

        if (targetsToWrite.length === 0) {
            console.log('nothing to write');

            return;
        }

        const now = new Date();

        const file = join(
            snapshotDir,
            extSnapshotFileName('spell-missile', host, database, now)
        );

        const rows: SpellSnapshotRow[] = targetsToWrite.map((p) => ({
            id: p.row.id,
            before: {
                dice: p.row.dice,
                damageBonus: p.row.damageBonus ?? null,
                casting: p.row.casting,
                executionMode: p.row.executionMode,
                targeting: p.row.targeting,
                spellEffects: p.row.spellEffects,
            },
            after: p.after as SpellColumns,
        }));

        mkdirSync(snapshotDir, { recursive: true });
        writeSnapshotAtomically(file, {
            version: 1,
            kind: 'spell-missile',
            createdAt: now.toISOString(),
            host,
            database,
            rows,
        });

        await db.$transaction(async (tx) => {
            for (const r of rows)
                if (!(await writeColumns(tx, r.id, r.before, r.after)))
                    throw new Error(`${r.id}: row changed since it was read`);
        }, EXT_TX_OPTIONS);

        console.log(`written ${rows.length} · snapshot: ${file}`);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((e) => {
    console.error(e instanceof Error ? e.message : 'error');
    process.exitCode = 1;
});
