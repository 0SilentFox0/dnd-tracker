import { useWorldEditorContext } from './WorldEditorContext';

import { useMapFields, useMarkerFields } from '@/lib/hooks/world';
import type { WorldMapDetail, WorldMarker } from '@/types/world';

export function useEditorMapFields(detail: WorldMapDetail) {
    const { campaignId, maps, editor, openMap, tool, setTool } =
        useWorldEditorContext();

    const fields = useMapFields({ campaignId, detail, maps, editor, openMap });

    return { ...fields, openMap, tool, setTool };
}

export function useEditorMarkerFields(marker: WorldMarker) {
    const { editor, select, openMap, redraw, redrawId } =
        useWorldEditorContext();

    const fields = useMarkerFields({ marker, editor, select });

    return { ...fields, openMap, redraw, redrawing: redrawId === marker.id };
}
