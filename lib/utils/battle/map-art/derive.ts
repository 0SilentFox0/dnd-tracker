import { edgeOnGrid } from '@/lib/utils/battle/grid/edge-keys';
import type { DoorState, GridKind } from '@/types/battle-grid';
import type { MapArtScene } from '@/types/battle-map';

export interface DerivedMechanics {
    walls: string[];
    bars: string[];
    doors: Record<string, DoorState>;
    blocked: string[];
}

const sorted = (keys: Iterable<string>): string[] =>
    [...keys].sort((a, b) => a.localeCompare(b));

export function deriveMechanics(
    scene: MapArtScene,
    grid: GridKind
): DerivedMechanics {
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
        blocked: sorted(Object.keys(scene.blocked)),
    };
}
