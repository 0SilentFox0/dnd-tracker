'use client';

import Image from 'next/image';

import type { WorldViewLayer } from '@/types/world';

interface WorldLayerImagesProps {
    layers: WorldViewLayer[];
    hidden: ReadonlySet<string>;
    width: number;
}

export function WorldLayerImages({
    layers,
    hidden,
    width,
}: WorldLayerImagesProps) {
    return (
        <>
            {layers.map((layer) =>
                layer.imageUrl && !hidden.has(layer.id) ? (
                    <div
                        key={layer.id}
                        data-testid={`world-layer-${layer.id}`}
                        className="pointer-events-none absolute"
                        style={{
                            left: `${layer.rect.x * 100}%`,
                            top: `${layer.rect.y * 100}%`,
                            width: `${layer.rect.w * 100}%`,
                            height: `${layer.rect.h * 100}%`,
                            opacity: layer.opacity,
                        }}
                    >
                        <Image
                            src={layer.imageUrl}
                            alt={layer.name}
                            fill
                            draggable={false}
                            sizes={`${Math.round(width * layer.rect.w)}px`}
                            className="pointer-events-none object-fill select-none"
                        />
                    </div>
                ) : null
            )}
        </>
    );
}
