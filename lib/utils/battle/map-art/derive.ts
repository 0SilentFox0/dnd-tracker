import { edgeOnGrid } from '@/lib/utils/battle/grid/edge-keys';
import { gridOf } from '@/lib/utils/battle/grid/geometry';
import type { MapDims } from '@/lib/utils/battle/map-art/scene';
import { stampCells } from '@/lib/utils/battle/map-art/stamp-cells';
import type { DoorState } from '@/types/battle-grid';
import type { MapArtScene } from '@/types/battle-map';

export interface DerivedMechanics {
    walls: string[];
    bars: string[];
    doors: Record<string, DoorState>;
    blocked: string[];
    sightBlocked: string[];
}

const sorted = (keys: Iterable<string>): string[] =>
    [...keys].sort((a, b) => a.localeCompare(b));

export function deriveMechanics(
    scene: MapArtScene,
    map: MapDims
): DerivedMechanics {
    const grid = gridOf(map);

    const { blocked, sight } = stampCells(scene.stamps, map);

    const walls: string[] = [];

    const bars: string[] = [];

    const doors: Record<string, DoorState> = {};

    for (const key of Object.keys(scene.walls)) {
        if (!edgeOnGrid(grid, key)) continue;

        const o = scene.openings[key];

        if (!o) walls.push(key);
        else if (o.kind === 'door')
            doors[key] = { open: o.open ?? false, ...(o.locked && { locked: true }) };
        else bars.push(key);
    }

    const orderedDoors = Object.fromEntries(
        sorted(Object.keys(doors)).map((k) => [k, doors[k]])
    );

    return {
        walls: sorted(walls),
        bars: sorted(bars),
        doors: orderedDoors,
        blocked: sorted(new Set([...Object.keys(scene.blocked), ...blocked])),
        sightBlocked: sorted(sight),
    };
}
