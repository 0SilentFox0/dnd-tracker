#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
    assertLocalStorageTarget,
    createTileObjectPath,
    parseTileUploadArgs,
    planTileUploads,
} from './upload-lib';
import {
    assertCampaignTileBudget,
    CAMPAIGN_TILE_BUDGET_BYTES,
    TILE_ASSET_MAX_BYTES,
    validateTileAsset,
} from './validate';

import { createAdminClient } from '@/lib/supabase/admin';
import { ensureBucket } from '@/lib/supabase/buckets';
import { staticAssetUploadOptions } from '@/lib/supabase/storage-cache';

const BUCKET = 'battle-tiles';

const KINDS = ['ground', 'wallfill', 'object', 'edge'] as const;

async function main(args: string[]): Promise<void> {
    const options = parseTileUploadArgs(args);

    const files = fs
        .readdirSync(options.directory, { withFileTypes: true })
        .filter(
            (entry) =>
                entry.isFile() && /\.(png|webp)$/i.test(entry.name)
        )
        .map((entry) => entry.name)
        .sort();

    if (files.length === 0) throw new Error('У теці немає PNG/WebP tile assets');

    const assets = await Promise.all(
        files.map(async (fileName) => {
            const bytes = fs.readFileSync(path.join(options.directory, fileName));

            const metadata = await validateTileAsset({
                fileName,
                bytes,
                kind: options.kind,
                footprint: options.footprint,
            });

            return {
                fileName,
                bytes,
                metadata,
                objectPath: createTileObjectPath({
                    campaignId: options.campaignId,
                    global: options.global,
                    kind: options.kind,
                    fileName,
                    bytes,
                }),
            };
        })
    );

    const incomingBytes = assets.reduce((sum, asset) => sum + asset.bytes.length, 0);

    if (options.campaignId && !options.upload)
        assertCampaignTileBudget(0, incomingBytes);

    if (!options.upload) {
        process.stdout.write(
            `${JSON.stringify(
                {
                    target: options.campaignId ?? 'global',
                    bucket: BUCKET,
                    upload: false,
                    assets: assets.map(({ metadata, objectPath }) => ({
                        ...metadata,
                        objectPath,
                    })),
                    incomingBytes,
                    maxFileBytes: TILE_ASSET_MAX_BYTES,
                    maxCampaignBytes: CAMPAIGN_TILE_BUDGET_BYTES,
                },
                null,
                2
            )}\n`
        );

        return;
    }

    const host = assertLocalStorageTarget(process.env.NEXT_PUBLIC_SUPABASE_URL);

    if (process.env.TILE_ASSET_TARGET !== 'local')
        throw new Error('Для upload задайте TILE_ASSET_TARGET=local');

    const supabase = createAdminClient();

    const ensured = await ensureBucket(supabase, BUCKET, {
        public: true,
        fileSizeLimit: TILE_ASSET_MAX_BYTES,
        allowedMimeTypes: ['image/png', 'image/webp'],
    });

    if (!ensured.ok) throw new Error(ensured.message);

    let currentBytes = 0;

    const existingPaths = new Set<string>();

    const prefix = options.campaignId ?? 'global';

    for (const kind of KINDS) {
        const { data, error } = await supabase.storage
            .from(BUCKET)
            .list(`${prefix}/${kind}`, { limit: 1000 });

        if (error) throw new Error(error.message);

        for (const object of data ?? []) {
            const objectPath = `${prefix}/${kind}/${object.name}`;

            existingPaths.add(objectPath);
            currentBytes += Number(
                (object.metadata as { size?: number } | null)?.size ?? 0
            );
        }
    }

    const { uploads, additionalBytes } = planTileUploads(assets, existingPaths);

    if (options.campaignId)
        assertCampaignTileBudget(currentBytes, additionalBytes);

    for (const asset of uploads) {
        const { error } = await supabase.storage.from(BUCKET).upload(
            asset.objectPath,
            asset.bytes,
            {
                ...staticAssetUploadOptions(asset.metadata.mime),
                upsert: false,
            }
        );

        if (error) throw new Error(`${asset.fileName}: ${error.message}`);
    }

    process.stdout.write(
        `Завантажено ${uploads.length} нових assets до ${BUCKET} (${options.campaignId ?? 'global'}); target=${host}.\n`
    );
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
    void main(process.argv.slice(2)).catch((error: unknown) => {
        process.stderr.write(
            `${error instanceof Error ? error.message : String(error)}\n`
        );
        process.exitCode = 1;
    });
}
