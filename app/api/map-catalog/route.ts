import { NextResponse } from 'next/server';

import {
    listVttMapCatalog,
    MapCatalogError,
} from '@/lib/server/map-catalog/vtt-maps';

const CATALOG_CACHE =
    'public, s-maxage=3600, stale-while-revalidate=86400';

export const revalidate = 3600;

export async function GET() {
    try {
        return NextResponse.json(await listVttMapCatalog(), {
            headers: { 'Cache-Control': CATALOG_CACHE },
        });
    } catch (error) {
        if (error instanceof MapCatalogError)
            return NextResponse.json(
                { error: error.code },
                { status: error.status }
            );

        return NextResponse.json(
            { error: 'MAP_CATALOG_UNAVAILABLE' },
            { status: 502 }
        );
    }
}
