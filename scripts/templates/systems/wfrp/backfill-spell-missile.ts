#!/usr/bin/env tsx
/**
 * Moves the grim spells of wfrp-base campaigns to missile damage (flat Damage + WPB - TB - AP, p235): casting.magic.missile, a declared Damage amount, no dice.
 * A row is rewritten only when it still equals the old template row; rows changed by the DM are reported and left alone.
 * Dry run by default; --apply refuses while any affected campaign has an active battle, writes with a compare-and-swap on the stored columns, and saves a snapshot for --revert.
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/templates/systems/wfrp/backfill-spell-missile.ts [--apply] [--allow-remote] [--json] [--snapshot-dir <dir>]
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/templates/systems/wfrp/backfill-spell-missile.ts --revert <file> [--force] [--allow-remote]
 */
import { Prisma } from '@prisma/client';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
    formatMissilePlan,
    isWfrpRules,
    planMissiles,
    type SpellRow,
    type SpellState,
    stateText,
    summarizeMissiles,
} from './backfill-spell-missile-plan';
import { SPELL_MISSILES } from './spell-missiles';

import '@/lib/utils/rules/systems/registry';
import {
    type ExtSnapshot,
    extSnapshotFileName,
    type ExtSnapshotRow,
    parseExtArgs,
    parseExtSnapshot,
    writeSnapshotAtomically,
} from '@/scripts/db/lib/backfill-ext-common';
import {
    activeBattleCampaigns,
    EXT_TX_OPTIONS,
} from '@/scripts/db/lib/backfill-ext-db';
import type { RawDb } from '@/scripts/db/lib/raw-db';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

const KIND = 'wfrp-spell-missile';

async function load(db: RawDb): Promise<SpellRow[]> {
    const rows = await db.$queryRaw<
        (Omit<SpellRow, 'campaignId'> & {
            campaignId: string;
            rules: unknown;
        })[]
    >(
        Prisma.sql`SELECT s.id, s."campaignId", s.slug, s.casting, s."spellEffects", s.dice, s."upcastDice", c.rules FROM spells s JOIN campaigns c ON c.id = s."campaignId" WHERE s.slug = ANY(${Object.keys(SPELL_MISSILES)}::text[]) ORDER BY s.id`
    );

    return rows
        .filter((r) => isWfrpRules(r.rules))
        .map(({ rules: _rules, ...row }) => ({
            ...row,
            dice: Number(row.dice),
            upcastDice: row.upcastDice === null ? null : Number(row.upcastDice),
        }));
}

async function write(
    tx: RawDb,
    id: string,
    from: SpellState,
    to: SpellState
): Promise<boolean> {
    const rows = await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`UPDATE spells SET casting = ${JSON.stringify(to.casting)}::jsonb, "spellEffects" = ${JSON.stringify(to.spellEffects)}::jsonb, dice = ${to.dice}, "upcastDice" = ${to.upcastDice} WHERE id = ${id} AND casting::text = ${JSON.stringify(from.casting)} AND "spellEffects"::text = ${JSON.stringify(from.spellEffects)} AND dice = ${from.dice} AND "upcastDice" IS NOT DISTINCT FROM ${from.upcastDice} RETURNING id`
    );

    return rows.length === 1;
}

const parseState = (text: string): SpellState => JSON.parse(text) as SpellState;

async function main() {
    const args = parseExtArgs(process.argv.slice(2));

    const host = assertSeedTarget(process.env.DATABASE_URL, args.allowRemote);

    const database = new URL(process.env.DATABASE_URL ?? '').pathname.slice(1);

    const { prisma } = await import('@/lib/db');

    const db = prisma as unknown as RawDb;

    try {
        const where = `DB: ${host}/${database}`;

        if (args.mode === 'revert') {
            const snapshot = parseExtSnapshot(
                readFileSync(args.revertFile ?? '', 'utf8'),
                KIND
            );

            let restored = 0;

            await db.$transaction(async (tx) => {
                for (const r of snapshot.rows) {
                    const ok = await write(
                        tx,
                        r.id,
                        parseState(r.after),
                        parseState(r.before)
                    );

                    if (ok) restored++;
                    else if (!args.force)
                        throw new Error(
                            `${r.id}: row changed after apply (--force only by owner decision)`
                        );
                }
            }, EXT_TX_OPTIONS);

            console.log(`${where} · REVERT · restored ${restored}`);

            return;
        }

        const rows = await load(db);

        const plans = planMissiles(rows);

        const active = await activeBattleCampaigns(db);

        const summary = summarizeMissiles(plans, active);

        if (args.mode === 'apply' && summary.activeBattle > 0)
            throw new Error(
                `Rows in campaigns with active battles (${summary.activeBattle}): finish the battles first`
            );

        let file: string | null = null;

        if (args.mode === 'apply') {
            const targets = plans.filter((p) => p.action === 'write');

            const now = new Date();

            const target = join(
                args.snapshotDir,
                extSnapshotFileName(KIND, host, database, now)
            );

            const snapshotRows: ExtSnapshotRow[] = targets.map((p) => ({
                table: 'spells',
                id: p.row.id,
                before: stateText({
                    casting: p.row.casting,
                    spellEffects: p.row.spellEffects,
                    dice: p.row.dice,
                    upcastDice: p.row.upcastDice,
                }),
                after: stateText(p.after as SpellState),
            }));

            if (snapshotRows.length > 0) {
                mkdirSync(args.snapshotDir, { recursive: true });

                const snapshot: ExtSnapshot = {
                    version: 1,
                    kind: KIND,
                    createdAt: now.toISOString(),
                    host,
                    database,
                    rows: snapshotRows,
                };

                writeSnapshotAtomically(target, snapshot);

                await db.$transaction(async (tx) => {
                    for (const [i, p] of targets.entries()) {
                        const ok = await write(
                            tx,
                            p.row.id,
                            parseState(snapshotRows[i].before),
                            p.after as SpellState
                        );

                        if (!ok)
                            throw new Error(
                                `${p.row.id}: row changed since it was read`
                            );
                    }
                }, EXT_TX_OPTIONS);

                file = target;
            }
        }

        if (args.json) {
            console.log(JSON.stringify({ summary, snapshot: file }, null, 2));

            return;
        }

        console.log(
            `${where} · ${args.mode === 'apply' ? 'APPLY' : 'DRY RUN'} · rows ${rows.length}`
        );

        for (const p of plans)
            for (const line of formatMissilePlan(p)) console.log(line);

        console.log(
            `summary: write ${summary.write} (active-battle campaigns ${summary.activeBattle}) · unchanged ${summary.unchanged} · modified ${summary.modified}`
        );

        if (args.mode === 'apply')
            console.log(file ? `snapshot: ${file}` : 'nothing to write');
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((e) => {
    console.error(e instanceof Error ? e.message : 'error');
    process.exitCode = 1;
});
