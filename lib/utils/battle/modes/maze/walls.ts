import { wallSet as edgeSet } from '@/lib/utils/battle/grid/walls';
import type { MazeConfig } from '@/types/battle-grid';

export type { ParsedEdge } from '@/lib/utils/battle/grid/walls';
export {
    allInteriorEdges,
    canStep,
    cornerOpen,
    edgeCells,
    edgeKey,
    hasWall,
    isEdgeCell,
    mazeNeighbors,
    parseEdgeKey,
} from '@/lib/utils/battle/grid/walls';

export function wallSet(maze: Pick<MazeConfig, 'walls'>): ReadonlySet<string> {
    return edgeSet(maze.walls);
}
