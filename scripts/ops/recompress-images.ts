#!/usr/bin/env tsx
/**
 * One-off re-encode of stored images to cut egress. Dry-run by default (downloads, measures, writes nothing).
 * `--apply` first saves every original under --backup-dir, then re-uploads over the same path (same format, so DB links stay valid).
 * Public CDN copies refresh only after their year-long cache expires or is purged.
 *
 *   pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/ops/recompress-images.ts \
 *     [--bucket scene-slides ...] [--max-edge 2048] [--min-saving 15] [--apply] [--backup-dir DIR] [--report FILE]
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { YEAR_CACHE_SECONDS } from '@/lib/constants/storage';
import { createAdminClient } from '@/lib/supabase/admin';
import {
    addObject,
    type BucketTotals,
    emptyTotals,
    recompressImage,
} from '@/scripts/ops/lib/recompress';

const DEFAULT_BUCKETS = [
    'scene-slides',
    'world-maps',
    'battle-maps',
    'avatars',
    'user-avatars',
    'compendium-media',
];

const PAGE = 100;

const MIME: Record<string, string> = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
};

const EXT_FORMAT: Record<string, string> = {
    png: 'png',
    jpg: 'jpeg',
    jpeg: 'jpeg',
    webp: 'webp',
};

const finite = (raw: string | undefined, fallback: number) => {
    const n = raw === undefined ? fallback : Number(raw);

    if (!Number.isFinite(n) || n <= 0) throw new Error(`bad numeric flag: ${raw}`);

    return n;
};

type Admin = ReturnType<typeof createAdminClient>;

function args() {
    const argv = process.argv.slice(2);

    const values = (flag: string) =>
        argv.flatMap((a, i) => (a === flag ? [argv[i + 1]] : []));

    return {
        apply: argv.includes('--apply'),
        buckets: values('--bucket').length ? values('--bucket') : DEFAULT_BUCKETS,
        maxEdge: finite(values('--max-edge')[0], 2048),
        minSavingPct: finite(values('--min-saving')[0], 15),
        backupDir:
            values('--backup-dir')[0] ??
            `.superpowers/recompress-backup-${new Date().toISOString().replace(/[:.]/g, '-')}`,
        report: values('--report')[0] ?? '.superpowers/recompress-report.json',
    };
}

async function* walk(admin: Admin, bucket: string, prefix = ''): AsyncGenerator<string> {
    for (let offset = 0; ; offset += PAGE) {
        const { data, error } = await admin.storage
            .from(bucket)
            .list(prefix, { limit: PAGE, offset });

        if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);

        if (!data?.length) return;

        for (const entry of data) {
            const path = prefix ? `${prefix}/${entry.name}` : entry.name;

            if (entry.id === null) yield* walk(admin, bucket, path);
            else yield path;
        }

        if (data.length < PAGE) return;
    }
}

async function main() {
    const opts = args();

    const admin = createAdminClient();

    const report: Record<string, BucketTotals> = {};

    console.log(opts.apply ? 'APPLY mode' : 'dry-run (no writes)', opts);

    for (const bucket of opts.buckets) {
        const totals = emptyTotals();

        report[bucket] = totals;

        for await (const path of walk(admin, bucket)) {
            const ext = path.split('.').pop()?.toLowerCase() ?? '';

            if (!EXT_FORMAT[ext]) continue;

            const { data, error } = await admin.storage.from(bucket).download(path);

            if (error || !data) {
                console.warn(`skip ${bucket}/${path}: ${error?.message}`);
                continue;
            }

            const original = Buffer.from(await data.arrayBuffer());

            const result = await recompressImage(original, opts).catch(() => null);

            const contentType = result && MIME[result.format];

            // extension and real format disagree: leave the object alone
            const mismatch = result && result.format !== EXT_FORMAT[ext];

            addObject(totals, original.length, mismatch ? null : result);

            if (mismatch) continue;

            if (!result || !contentType || !opts.apply) continue;

            const backup = join(opts.backupDir, bucket, path);

            if (existsSync(backup)) {
                console.warn(`skip ${bucket}/${path}: backup already exists`);
                continue;
            }

            mkdirSync(dirname(backup), { recursive: true });
            writeFileSync(backup, original, { flag: 'wx' });

            const { error: upError } = await admin.storage
                .from(bucket)
                .upload(path, result.bytes, {
                    upsert: true,
                    contentType,
                    cacheControl: YEAR_CACHE_SECONDS,
                });

            if (upError) console.warn(`upload ${bucket}/${path}: ${upError.message}`);
        }

        const mb = (n: number) => (n / 1048576).toFixed(1);

        console.log(
            `${bucket}: ${totals.objects} files, ${totals.changed} shrinkable, ${mb(totals.before)} MB -> ${mb(totals.after)} MB`
        );
    }

    mkdirSync(dirname(opts.report), { recursive: true });
    writeFileSync(opts.report, JSON.stringify({ opts, report }, null, 2));
    console.log(`report: ${opts.report}`);
}

main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
