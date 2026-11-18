import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface Fit {
    width: number;
    height: number;
    rotated: boolean;
}

interface Props {
    cameraMode: boolean;
    fitAll: Fit;
    renderedFit: Fit;
    offset: { x: number; y: number };
    zoom: number;
    children: ReactNode;
}

export function MapTransformLayers({
    cameraMode,
    fitAll,
    renderedFit,
    offset,
    zoom,
    children,
}: Props) {
    return (
        <div
            className={cn(
                'origin-top-left',
                cameraMode ? 'absolute top-0 left-0' : 'absolute inset-0'
            )}
            style={{
                ...(cameraMode && {
                    width: fitAll.width,
                    height: fitAll.height,
                }),
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            }}
        >
            <div
                data-map-rotated={renderedFit.rotated || undefined}
                className={cn(
                    'absolute top-0 left-0 origin-top-left',
                    !renderedFit.rotated && 'inset-0'
                )}
                style={
                    renderedFit.rotated
                        ? {
                              width: renderedFit.height,
                              height: renderedFit.width,
                              transform: `translateX(${renderedFit.width}px) rotate(90deg)`,
                          }
                        : undefined
                }
            >
                {children}
            </div>
        </div>
    );
}
