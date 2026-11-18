import { type Dispatch, type SetStateAction, useMemo } from 'react';

import { DOOR_LIMIT_NOTICE, EDGE_LIMIT_NOTICE } from './mapEditorNotices';

import type { EdgeEditing } from '@/lib/hooks/battle/useEdgeStroke';
import {
    type EdgeOp,
    isEdgeTool,
    paintDoors,
    paintEdges,
    type SetupTool,
    wallSet,
} from '@/lib/utils/battle/grid';
import type { BattleMapConfig } from '@/types/battle-grid';
import type { LogLine } from '@/types/text';

export function useMapEdgeEditing({
    map,
    setMap,
    setNotice,
    tool,
    modeActive,
    doorLocked,
}: {
    map: BattleMapConfig;
    setMap: Dispatch<SetStateAction<BattleMapConfig>>;
    setNotice(notice: LogLine | null): void;
    tool: SetupTool | null;
    modeActive: boolean;
    doorLocked: boolean;
}) {
    const edgeTool = isEdgeTool(tool) && !modeActive ? tool : null;

    return useMemo<EdgeEditing | null>(() => {
        if (!edgeTool) return null;

        const walls = wallSet(map.walls);

        const bars = wallSet(map.bars);

        if (edgeTool === 'edge-door') {
            return {
                existing: new Set(Object.keys(map.doors ?? {})),
                onCommit: (add: string[], remove: string[]) => {
                    const result = paintDoors(map, { add, remove }, doorLocked);

                    if (result.overflow) setNotice(DOOR_LIMIT_NOTICE);

                    setMap(result.map);
                },
            };
        }

        const ops: [EdgeOp, EdgeOp] | null =
            edgeTool === 'edge-erase'
                ? null
                : edgeTool === 'edge-wall'
                  ? ['add-walls', 'remove-walls']
                  : ['add-bars', 'remove-bars'];

        const paint = (m: BattleMapConfig, add: string[], remove: string[]) => {
            if (!ops) return paintEdges(m, remove, 'erase');

            const added = paintEdges(m, add, ops[0]);

            const removed = paintEdges(added.map, remove, ops[1]);

            return {
                map: removed.map,
                overflow: added.overflow || removed.overflow,
            };
        };

        const onCommit = (add: string[], remove: string[]) => {
            const result = paint(map, add, remove);

            if (result.overflow) setNotice(EDGE_LIMIT_NOTICE);

            setMap(result.map);
        };

        if (edgeTool === 'edge-erase')
            return {
                existing: new Set([
                    ...walls,
                    ...bars,
                    ...Object.keys(map.doors ?? {}),
                ]),
                erase: true,
                onCommit,
            };

        return {
            existing: edgeTool === 'edge-wall' ? walls : bars,
            onCommit,
        };
    }, [edgeTool, map, doorLocked, setMap, setNotice]);
}
