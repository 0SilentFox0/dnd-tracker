import { useWorldEditorContext } from "./WorldEditorContext";

import { WorldCrumbs } from "@/components/world/WorldCrumbs";

export function WorldBreadcrumbs({ mapId }: { mapId: string }) {
  const { maps, openMap } = useWorldEditorContext();

  return <WorldCrumbs maps={maps} mapId={mapId} onOpen={openMap} />;
}
