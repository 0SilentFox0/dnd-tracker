"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Map as MapIcon } from "lucide-react";

import { EmptyState, QueryState } from "@/components/common/states";
import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { NewWorldMapDialog } from "@/components/world/editor/NewWorldMapDialog";
import { WorldBreadcrumbs } from "@/components/world/editor/WorldBreadcrumbs";
import { WorldEditorContext, type WorldEditorCtx, type WorldTool } from "@/components/world/editor/WorldEditorContext";
import { WorldMapSettings } from "@/components/world/editor/WorldMapSettings";
import { WorldMapView } from "@/components/world/WorldMapView";
import { useWorldEditor, useWorldMap, useWorldMaps } from "@/lib/hooks/world";
import type { MapPoint, WorldMapDetail } from "@/types/world";

const ENTRY_DOT = { width: "1.6%", aspectRatio: "1", transform: "translate(-50%, -50%)" } as const;

export function WorldEditorPageClient({ campaignId, campaignName, mapId }: { campaignId: string; campaignName: string; mapId: string | null }) {
  const router = useRouter();

  const pathname = usePathname();

  const maps = useWorldMaps(campaignId);

  const detail = useWorldMap(campaignId, mapId);

  const editor = useWorldEditor(campaignId, mapId);

  const [selectedId, select] = useState<string | null>(null);

  const [tool, setTool] = useState<WorldTool>("select");

  const [creating, setCreating] = useState(false);

  const openMap = useCallback(
    (id: string | null) => {
      select(null);
      setTool("select");
      router.replace(id ? `${pathname}?map=${id}` : pathname);
    },
    [router, pathname],
  );

  const ctx: WorldEditorCtx = useMemo(
    () => ({ campaignId, detail: detail.data ?? null, maps: maps.data ?? [], editor, selectedId, select, openMap, tool, setTool }),
    [campaignId, detail.data, maps.data, editor, selectedId, openMap, tool],
  );

  const empty = (
    <EmptyState
      icon={MapIcon}
      title="Завантажте карту континенту"
      description="З неї почнеться подорож: на ній ставляться міста, зони й входи у вкладені карти."
      action={<Button onClick={() => setCreating(true)}>Завантажити карту</Button>}
    />
  );

  const placeEntry = (p: MapPoint, d: WorldMapDetail) => {
    setTool("select");
    void editor.map.update.mutateOk({ id: d.map.id, data: { entryX: p.x, entryY: p.y } });
  };

  return (
    <WorldEditorContext.Provider value={ctx}>
      <HudPage>
        <QueryState query={maps} empty={empty}>
          {() =>
            mapId ? (
              <QueryState query={detail}>
                {(d) => (
                  <>
                    <HudPageHeader title={d.map.name} subtitle={<WorldBreadcrumbs mapId={d.map.id} />} actions={<span className="text-sm text-hud-muted">{campaignName}</span>} />
                    <div className="grid gap-3 lg:grid-cols-[1fr_20rem]">
                      <div className="h-[60dvh] lg:h-[calc(100dvh-12rem)]">
                        <WorldMapView
                          detail={d}
                          selectedId={selectedId}
                          handlers={{ onMapClick: (p) => (tool === "entry" ? placeEntry(p, d) : select(null)), onMarkerClick: select }}
                          overlay={<span className="pointer-events-none absolute rounded-full border-2 border-[var(--gold)] bg-[var(--gold)]/40" style={{ ...ENTRY_DOT, left: `${d.map.entryX * 100}%`, top: `${d.map.entryY * 100}%` }} />}
                        />
                      </div>
                      <HudPanel>
                        <WorldMapSettings key={d.map.id} />
                      </HudPanel>
                    </div>
                  </>
                )}
              </QueryState>
            ) : (
              empty
            )
          }
        </QueryState>
        <NewWorldMapDialog open={creating} onOpenChange={setCreating} />
      </HudPage>
    </WorldEditorContext.Provider>
  );
}
