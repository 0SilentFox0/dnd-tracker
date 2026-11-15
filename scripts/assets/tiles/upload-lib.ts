import { createHash } from 'node:crypto';
import path from 'node:path';

import type { TileAssetKind } from './validate';

export interface TileUploadOptions {
    directory: string;
    kind: TileAssetKind;
    campaignId?: string;
    global?: boolean;
    footprint?: { cols: number; rows: number };
    upload: boolean;
}

export interface TileUploadFile {
    objectPath: string;
    bytes: Uint8Array;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const KINDS: readonly TileAssetKind[] = [
    'ground',
    'wallfill',
    'object',
    'edge',
];

export function assertLocalStorageTarget(url: string | undefined): string {
    if (!url) throw new Error('Не задано Supabase URL');

    let host: string;

    try {
        host = new URL(url).hostname;
    } catch {
        throw new Error('Некоректний Supabase URL');
    }

    if (!LOCAL_HOSTS.has(host))
        throw new Error(`Tile assets дозволено завантажувати лише localhost, отримано ${host}`);

    return host;
}

export function planTileUploads<T extends TileUploadFile>(
    assets: readonly T[],
    existingPaths: ReadonlySet<string>
): { uploads: T[]; additionalBytes: number } {
    const uploads = assets.filter((asset) => !existingPaths.has(asset.objectPath));

    return {
        uploads,
        additionalBytes: uploads.reduce((sum, asset) => sum + asset.bytes.length, 0),
    };
}

function valueAfter(args: string[], flag: string): string | undefined {
    const index = args.indexOf(flag);

    if (index < 0) return undefined;

    const value = args[index + 1];

    if (!value || value.startsWith('--'))
        throw new Error(`Для ${flag} потрібне значення`);

    return value;
}

export function parseTileUploadArgs(args: string[]): TileUploadOptions {
    if (args.includes('--allow-remote'))
        throw new Error('Завантаження tile assets у production заборонене');

    const directory = args[0] && !args[0].startsWith('--') ? args[0] : undefined;

    const kind = valueAfter(args, '--kind');

    const campaignId = valueAfter(args, '--campaign');

    const global = args.includes('--global');

    const footprintValue = valueAfter(args, '--footprint');

    const footprintMatch = footprintValue
        ? /^(\d+)x(\d+)$/.exec(footprintValue)
        : null;

    if (!directory) throw new Error('Вкажіть теку з tile assets');

    if (!kind || !KINDS.includes(kind as TileAssetKind))
        throw new Error(`Вкажіть --kind ${KINDS.join('|')}`);

    if (Boolean(campaignId) === global)
        throw new Error('Вкажіть одну ціль: --campaign <id> або --global');

    if (campaignId && !/^[a-zA-Z0-9_-]+$/.test(campaignId))
        throw new Error('Некоректний campaignId');

    if (footprintValue && !footprintMatch)
        throw new Error('Формат --footprint має бути WIDTHxHEIGHT');

    if (kind === 'object' && !footprintMatch)
        throw new Error('Для --kind object вкажіть --footprint WIDTHxHEIGHT');

    if (kind !== 'object' && footprintValue)
        throw new Error('--footprint дозволено лише для --kind object');

    if (
        footprintMatch &&
        (Number(footprintMatch[1]) < 1 ||
            Number(footprintMatch[1]) > 2 ||
            Number(footprintMatch[2]) < 1 ||
            Number(footprintMatch[2]) > 2)
    )
        throw new Error('Footprint об’єкта має бути від 1x1 до 2x2');

    return {
        directory,
        kind: kind as TileAssetKind,
        ...(campaignId && { campaignId }),
        ...(global && { global }),
        ...(footprintMatch && {
            footprint: {
                cols: Number(footprintMatch[1]),
                rows: Number(footprintMatch[2]),
            },
        }),
        upload: args.includes('--upload'),
    };
}

export function createTileObjectPath(input: {
    campaignId?: string;
    global?: boolean;
    kind: TileAssetKind;
    fileName: string;
    bytes: Buffer;
}): string {
    if (path.basename(input.fileName) !== input.fileName)
        throw new Error('Ім’я asset має бути ім’ям файлу без шляху');

    if (Boolean(input.campaignId) === Boolean(input.global))
        throw new Error('Вкажіть одну ціль: campaignId або global');

    const prefix = input.global
        ? 'global'
        : input.campaignId && /^[a-zA-Z0-9_-]+$/.test(input.campaignId)
          ? input.campaignId
          : null;

    if (!prefix) throw new Error('Вкажіть коректний campaignId або --global');

    const digest = createHash('sha256')
        .update(input.bytes)
        .digest('hex')
        .slice(0, 16);

    return `${prefix}/${input.kind}/${digest}-${input.fileName}`;
}
