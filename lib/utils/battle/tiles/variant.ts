export interface TileVariant {
    asset: string;
    weight: number;
}

function hashCell(seed: string, x: number, y: number, tileId: number): number {
    const value = `${seed}:${x}:${y}:${tileId}`;

    let hash = 0x811c9dc5;

    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }

    return hash >>> 0;
}

export function variantFor(
    mapSeed: string,
    x: number,
    y: number,
    tileId: number,
    variants: readonly TileVariant[]
): number {
    if (
        variants.length === 0 ||
        variants.some(
            (variant) =>
                !Number.isSafeInteger(variant.weight) || variant.weight <= 0
        )
    )
        throw new Error('Variants must have positive integer weights');

    const totalWeight = variants.reduce((sum, variant) => sum + variant.weight, 0);

    if (!Number.isSafeInteger(totalWeight))
        throw new Error('Variant weights exceed the safe integer range');

    let pick = hashCell(mapSeed, x, y, tileId) % totalWeight;

    for (let index = 0; index < variants.length; index++) {
        pick -= variants[index].weight;

        if (pick < 0) return index;
    }

    return variants.length - 1;
}
