"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useHeroEyes } from "./useHeroEyes";
import { useMapDrawing } from "./useMapDrawing";
import { useMoveTarget } from "./useMoveTarget";
import { useRemoveMarker } from "./useRemoveMarker";
import { useWorldEditor } from "./useWorldEditor";
import { useWorldHeroes } from "./useWorldHeroes";
import { useWorldMap } from "./useWorldMap";
import { useWorldMaps } from "./useWorldMaps";

import type { WorldEditorCtx } from "@/components/world/editor/WorldEditorContext";
import { polygonCentroid } from "@/lib/utils/world/geometry";
import type { CreateWorldMarkerData, MapPoint, Polygon, WorldMarker } from "@/types/world";

const NO_MARKERS: WorldMarker[] = [];

interface Options {
  campaignId: string;
  mapId: string | null;
  initialSelectedId?: string;
}

export function useWorldEditorPage({ campaignId, mapId, initialSelectedId }: Options) {
  const router = useRouter();

  const t = useTranslations("world");

  const pathname = usePathname();

  const maps = useWorldMaps(campaignId);

  const detail = useWorldMap(campaignId, mapId, { keepPrevious: true });

  const editor = useWorldEditor(campaignId, mapId);

  const roster = useWorldHeroes(campaignId);

  const eyes = useHeroEyes(campaignId, mapId);

  const [selectedId, select] = useState<string | null>(initialSelectedId ?? null);

  const [seenInitial, setSeenInitial] = useState(initialSelectedId);

  if (initialSelectedId !== seenInitial) {
    setSeenInitial(initialSelectedId);

    if (initialSelectedId) select(initialSelectedId);
  }

  const moveTarget = useMoveTarget(detail.data?.markers ?? NO_MARKERS);

  const [creating, setCreating] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const [redrawId, setRedrawId] = useState<string | null>(null);

  const createMarker = async (data: Omit<CreateWorldMarkerData, "mapId">) => {
    if (!mapId) return;

    try {
      select((await editor.marker.create.mutateAsync({ mapId, ...data })).id);
    } catch {
      // create's errorText already notified
    }
  };

  const { reset: resetTarget } = moveTarget;

  const drawing = useMapDrawing({
    onPoint: (p) => void createMarker({ kind: "point", x: p.x, y: p.y, name: t("defaults.point"), icon: "landmark" }),
    onZone: (polygon: Polygon) => {
      if (redrawId) {
        void editor.marker.update.mutateOk({ id: redrawId, data: { polygon } });
        setRedrawId(null);
        drawing.setTool("select");

        return;
      }

      const c = polygonCentroid(polygon);

      void createMarker({ kind: "zone", x: c.x, y: c.y, polygon, name: t("defaults.zone") });
    },
    onEntry: (p: MapPoint) => {
      if (mapId) void editor.map.update.mutateOk({ id: mapId, data: { entryX: p.x, entryY: p.y } });
    },
    onMove: (p) => {
      if (!detail.isPlaceholderData) moveTarget.pickPoint(p);
    },
  }, !eyes.asHeroId);

  const { tool, setTool } = drawing;

  useRemoveMarker({ marker: detail.data?.markers.find((m) => m.id === selectedId), editor, select, hotkey: tool === "select" });

  const closePanel = useCallback(() => {
    select(null);
    setSettingsOpen(false);
  }, []);

  const redraw = useCallback(
    (id: string | null) => {
      setRedrawId(id);
      setTool(id ? "zone" : "select");
    },
    [setTool],
  );

  const openMap = useCallback(
    (id: string | null, { keepTool = false }: { keepTool?: boolean } = {}) => {
      select(null);
      setSettingsOpen(false);
      setRedrawId(null);
      resetTarget();

      if (!keepTool) setTool("select");

      router.replace(id ? `${pathname}?map=${id}` : pathname);
    },
    [router, pathname, setTool, resetTarget],
  );

  const changeEyes = (heroId: string | null) => {
    eyes.setAsHeroId(heroId);
    select(null);
    setSettingsOpen(false);
    setTool("select");
  };

  const ctx: WorldEditorCtx = useMemo(
    () => ({ campaignId, detail: detail.data ?? null, maps: maps.data ?? [], editor, selectedId, select, openMap, tool, setTool, redrawId, redraw }),
    [campaignId, detail.data, maps.data, editor, selectedId, openMap, tool, setTool, redrawId, redraw],
  );

  return {
    ctx,
    maps,
    detail,
    roster,
    eyes,
    drawing,
    moveTarget,
    editor,
    selectedId,
    select,
    tool,
    setTool,
    creating,
    setCreating,
    settingsOpen,
    setSettingsOpen,
    closePanel,
    openMap,
    changeEyes,
  };
}
