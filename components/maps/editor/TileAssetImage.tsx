import Image from 'next/image';

import { tileAssetUrl } from '@/components/battle/map/tiles/assets';
import type { TILE_CATALOG } from '@/lib/constants/tilesets/catalog';

const TILE_PX = 256;

export function TileAssetImage({
    tile,
    alt,
    className,
}: {
    tile: (typeof TILE_CATALOG)[number];
    alt: string;
    className: string;
}) {
    if (!tile.assetFile) return null;

    return (
        <Image
            src={tileAssetUrl(tile)}
            alt={alt}
            width={tile.footprint.cols * TILE_PX}
            height={tile.footprint.rows * TILE_PX}
            unoptimized
            className={className}
        />
    );
}
