export interface EdgeNeighbors {
    north: boolean;
    east: boolean;
    south: boolean;
    west: boolean;
}

export function edgeMask(neighbors: EdgeNeighbors): number {
    return (
        Number(neighbors.north) |
        (Number(neighbors.east) << 1) |
        (Number(neighbors.south) << 2) |
        (Number(neighbors.west) << 3)
    );
}
