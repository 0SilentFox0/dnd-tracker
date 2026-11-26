'use client';

import { useMemo, useState } from 'react';

import {
    STAMP_BIOMES,
    STAMPS,
    type StampBiome,
    type StampDef,
} from '@/lib/constants/map-art/stamps';

export const ALL_CATEGORIES = 'all';

export function useStampPalette(t: (key: string) => string) {
    const [biome, setBiome] = useState<StampBiome>(STAMP_BIOMES[0]);

    const [category, setCategory] = useState(ALL_CATEGORIES);

    const [query, setQuery] = useState('');

    const inBiome = useMemo(() => STAMPS.filter((d) => d.biome === biome), [biome]);

    const categories = useMemo(
        () => [...new Set(inBiome.map((d) => d.category))],
        [inBiome]
    );

    const items = useMemo<StampDef[]>(() => {
        const q = query.trim().toLowerCase();

        return inBiome.filter(
            (d) =>
                (category === ALL_CATEGORIES || d.category === category) &&
                (!q || t(d.nameKey).toLowerCase().includes(q))
        );
    }, [inBiome, category, query, t]);

    return {
        biome,
        setBiome: (next: StampBiome) => {
            setBiome(next);
            setCategory(ALL_CATEGORIES);
        },
        category,
        setCategory,
        categories,
        query,
        setQuery,
        items,
    };
}
