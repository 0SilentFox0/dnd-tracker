import { useWorldEditorContext } from './WorldEditorContext';

import { useMapFields, useMarkerFields, useRemoveMap } from '@/lib/hooks/world';
import type { WorldMapDetail, WorldMarker } from '@/types/world';

export function useEditorMapFields(detail: WorldMapDetail) {
    const { campaignId, maps, editor, openMap, tool, setTool } =
        useWorldEditorContext();

    const fields = useMapFields({ campaignId, detail, maps, editor, openMap });

    return { ...fields, openMap, tool, setTool };
}

export function useEditorMarkerFields(marker: WorldMarker) {
    const { maps, editor, select, openMap, redraw, redrawId } =
        useWorldEditorContext();

    const fields = useMarkerFields({ marker, editor, select });

    const removeMap = useRemoveMap(maps, editor);

    return {
        ...fields,
        removeMap,
        openMap,
        redraw,
        redrawing: redrawId === marker.id,
    };
}
