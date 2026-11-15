import sharp from 'sharp';

export const TILE_ASSET_MAX_BYTES = 200 * 1024;

export const CAMPAIGN_TILE_BUDGET_BYTES = 50 * 1024 * 1024;

export type TileAssetKind = 'ground' | 'wallfill' | 'object' | 'edge';

export type TileAssetErrorCode =
    | 'INVALID_FILENAME'
    | 'FILE_TOO_LARGE'
    | 'UNSUPPORTED_FORMAT'
    | 'FORMAT_MISMATCH'
    | 'INVALID_IMAGE'
    | 'INVALID_FOOTPRINT'
    | 'INVALID_DIMENSIONS'
    | 'TRANSPARENCY_REQUIRED'
    | 'CAMPAIGN_BUDGET_EXCEEDED';

export class TileAssetError extends Error {
    constructor(
        readonly code: TileAssetErrorCode,
        message: string
    ) {
        super(message);
        this.name = 'TileAssetError';
    }
}

export interface ValidateTileAssetInput {
    fileName: string;
    bytes: Buffer;
    kind: TileAssetKind;
    footprint?: { cols: number; rows: number };
}

export interface ValidatedTileAsset {
    fileName: string;
    kind: TileAssetKind;
    width: number;
    height: number;
    mime: 'image/png' | 'image/webp';
    bytes: number;
    hasAlpha: boolean;
}

const extensionMime = {
    png: 'image/png',
    webp: 'image/webp',
} as const;

function invalid(code: TileAssetErrorCode, message: string): never {
    throw new TileAssetError(code, message);
}

function expectedSize(
    kind: TileAssetKind,
    footprint?: { cols: number; rows: number }
): { width: number; height: number } {
    if (kind === 'ground' || kind === 'wallfill')
        return { width: 256, height: 256 };

    if (kind === 'edge') return { width: 256, height: 64 };

    if (
        !footprint ||
        !Number.isInteger(footprint.cols) ||
        !Number.isInteger(footprint.rows) ||
        footprint.cols < 1 ||
        footprint.rows < 1 ||
        footprint.cols > 2 ||
        footprint.rows > 2
    )
        invalid('INVALID_FOOTPRINT', 'Footprint об’єкта має бути від 1x1 до 2x2');

    return { width: footprint.cols * 256, height: footprint.rows * 256 };
}

export async function validateTileAsset({
    fileName,
    bytes,
    kind,
    footprint,
}: ValidateTileAssetInput): Promise<ValidatedTileAsset> {
    const match = /^([a-z0-9][a-z0-9_-]*)\.(png|webp)$/i.exec(fileName);

    if (!match)
        invalid('INVALID_FILENAME', 'Ім’я файлу має бути basename із розширенням PNG або WebP');

    if (bytes.length === 0) invalid('INVALID_IMAGE', 'Файл текстури порожній');

    if (bytes.length > TILE_ASSET_MAX_BYTES)
        invalid('FILE_TOO_LARGE', `Файл текстури перевищує ${TILE_ASSET_MAX_BYTES} байтів`);

    let metadata: sharp.Metadata;

    try {
        const decoded = sharp(bytes, { failOn: 'error', limitInputPixels: 512 * 512 });

        metadata = await decoded.metadata();

        if (metadata.width && metadata.height)
            await decoded.raw().toBuffer();
    } catch {
        invalid('INVALID_IMAGE', 'Не вдалося декодувати зображення текстури');
    }

    if (metadata.width === undefined || metadata.height === undefined)
        invalid('INVALID_IMAGE', 'У зображення немає розмірів');

    const mime =
        metadata.format === 'png'
            ? 'image/png'
            : metadata.format === 'webp'
              ? 'image/webp'
              : null;

    if (!mime) invalid('UNSUPPORTED_FORMAT', 'Підтримуються лише PNG і WebP');

    if (mime !== extensionMime[match[2].toLowerCase() as 'png' | 'webp'])
        invalid('FORMAT_MISMATCH', 'Розширення файлу не відповідає формату зображення');

    const size = expectedSize(kind, footprint);

    if (metadata.width !== size.width || metadata.height !== size.height)
        invalid(
            'INVALID_DIMENSIONS',
            `Розмір текстури ${kind} має бути ${size.width}x${size.height} px`
        );

    const hasAlpha = metadata.hasAlpha === true;

    if ((kind === 'object' || kind === 'edge') && !hasAlpha)
        invalid('TRANSPARENCY_REQUIRED', `Текстурі ${kind} потрібен alpha-канал`);

    if ((kind === 'ground' || kind === 'wallfill') && hasAlpha)
        invalid('INVALID_IMAGE', `Текстура ${kind} має бути непрозорою`);

    return {
        fileName,
        kind,
        width: metadata.width,
        height: metadata.height,
        mime,
        bytes: bytes.length,
        hasAlpha,
    };
}

export function assertCampaignTileBudget(
    currentBytes: number,
    incomingBytes: number
): void {
    if (
        !Number.isSafeInteger(currentBytes) ||
        !Number.isSafeInteger(incomingBytes) ||
        currentBytes < 0 ||
        incomingBytes < 0
    )
        invalid(
            'CAMPAIGN_BUDGET_EXCEEDED',
            'Розміри файлів мають бути невід’ємними цілими числами'
        );

    if (currentBytes + incomingBytes > CAMPAIGN_TILE_BUDGET_BYTES)
        invalid(
            'CAMPAIGN_BUDGET_EXCEEDED',
            `Текстури кампанії перевищують ліміт ${CAMPAIGN_TILE_BUDGET_BYTES} байтів`
        );
}
