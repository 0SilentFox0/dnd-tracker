"use client";

import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";

import { worldKeys } from "./keys";

import { createWorldMap, createWorldMarker, deleteWorldMap, deleteWorldMarker, updateWorldMap, updateWorldMarker } from "@/lib/api/world";
import { useCrudMutation } from "@/lib/hooks/common";
import type { CreateWorldMapData, CreateWorldMarkerData, UpdateWorldMapData, UpdateWorldMarkerData, WorldMapDetail } from "@/types/world";

export function useWorldEditor(campaignId: string, mapId: string | null) {
  const queryClient = useQueryClient();

  const t = useTranslations("world.errors");

  const mapKey = worldKeys.map(campaignId, mapId ?? "");

  const mapKeys = () => [worldKeys.maps(campaignId), ...(mapId ? [mapKey] : [])];

  const patchDetail = (fn: (d: WorldMapDetail) => WorldMapDetail) => queryClient.setQueryData<WorldMapDetail>(mapKey, (d) => (d ? fn(d) : d));

  const snapshot = async () => {
    await queryClient.cancelQueries({ queryKey: mapKey });

    return queryClient.getQueryData<WorldMapDetail>(mapKey) ?? null;
  };

  const restore = (_e: unknown, _v: unknown, prev: WorldMapDetail | null | undefined) => {
    if (prev) queryClient.setQueryData(mapKey, prev);
  };

  const createMap = useCrudMutation({
    mutationFn: (data: CreateWorldMapData) => createWorldMap(campaignId, data),
    invalidateKeys: mapKeys,
    errorText: t("createMap"),
  });

  const updateMap = useCrudMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorldMapData }) => updateWorldMap(campaignId, id, data),
    invalidateKeys: (_d, { id }) => [worldKeys.maps(campaignId), worldKeys.map(campaignId, id)],
    errorText: t("saveMap"),
  });

  const removeMap = useCrudMutation({
    mutationFn: (id: string) => deleteWorldMap(campaignId, id),
    invalidateKeys: [worldKeys.maps(campaignId)],
    errorText: t("deleteMap"),
  });

  const createMarker = useCrudMutation({
    mutationFn: (data: CreateWorldMarkerData) => createWorldMarker(campaignId, data),
    invalidateKeys: () => [worldKeys.map(campaignId, mapId ?? "")],
    errorText: t("createMarker"),
  });

  const updateMarker = useCrudMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorldMarkerData }) => updateWorldMarker(campaignId, id, data),
    onMutate: async ({ id, data }) => {
      const prev = await snapshot();

      patchDetail((d) => ({ ...d, markers: d.markers.map((m) => (m.id === id ? { ...m, ...data } : m)) }));

      return prev;
    },
    onError: restore,
    invalidateKeys: () => [worldKeys.map(campaignId, mapId ?? "")],
    errorText: t("saveMarker"),
  });

  const removeMarker = useCrudMutation({
    mutationFn: (id: string) => deleteWorldMarker(campaignId, id),
    onMutate: async (id) => {
      const prev = await snapshot();

      patchDetail((d) => ({ ...d, markers: d.markers.filter((m) => m.id !== id) }));

      return prev;
    },
    onError: restore,
    invalidateKeys: () => [worldKeys.maps(campaignId), worldKeys.map(campaignId, mapId ?? "")],
    errorText: t("deleteMarker"),
  });

  return {
    map: { create: createMap, update: updateMap, remove: removeMap },
    marker: { create: createMarker, update: updateMarker, remove: removeMarker },
    isPending: [createMap, updateMap, removeMap, createMarker, updateMarker, removeMarker].some((m) => m.isPending),
  };
}
