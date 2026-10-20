"use client";

import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { trackKeys } from "./keys";
import { useTracks } from "./useTracks";

import { createTrack, deleteTrack, reorderTracks, updateTrack, uploadTrackFile } from "@/lib/api/tracks";
import { useConfirm, useCrudMutation, useNotify } from "@/lib/hooks/common";
import { moveTrack } from "@/lib/utils/audio/order";
import { readAudioDuration } from "@/lib/utils/audio/read-duration";
import type { CampaignTrack } from "@/types/audio";

export interface MusicLibrary {
  tracks: CampaignTrack[];
  loading: boolean;
  busy: boolean;
  upload(file: File): Promise<void>;
  addYoutube(data: { url: string; title?: string }): Promise<boolean>;
  rename(id: string, title: string): void;
  remove(track: CampaignTrack): Promise<void>;
  move(index: number, dir: -1 | 1): void;
}

const stripExtension = (name: string) => name.replace(/\.[^.]+$/, "").slice(0, 120) || "Трек";

const messageOf = (e: unknown) => (e instanceof Error && e.message ? e.message : "Не вдалося зберегти");

// у стані бою лише знімок треку: YouTube грає далі, а файл зі сховища зникає одразу
const DELETE_NOTE: Record<CampaignTrack["kind"], string> = {
  file: "Трек зникне з бібліотеки, а файл — зі сховища. Якщо він зараз грає в бою, музика зупиниться для всіх.",
  youtube: "Трек зникне з бібліотеки.",
};

export function useMusicLibrary(campaignId: string, initial: CampaignTrack[]): MusicLibrary {
  const queryClient = useQueryClient();

  const confirm = useConfirm();

  const notify = useNotify();

  const key = trackKeys.list(campaignId);

  const { data: tracks = initial, isLoading } = useTracks(campaignId, { initial });

  const onError = (e: unknown) => void notify(messageOf(e));

  const invalidateKeys = [key];

  const uploadM = useCrudMutation({
    mutationFn: async (file: File) => uploadTrackFile(campaignId, file, { title: stripExtension(file.name), durationSec: await readAudioDuration(file) }),
    invalidateKeys,
    onError,
  });

  const youtubeM = useCrudMutation({ mutationFn: (data: { url: string; title?: string }) => createTrack(campaignId, { kind: "youtube", ...data }), invalidateKeys, onError });

  const renameM = useCrudMutation({ mutationFn: ({ id, title }: { id: string; title: string }) => updateTrack(campaignId, id, { title }), invalidateKeys, onError });

  const deleteM = useCrudMutation({ mutationFn: (id: string) => deleteTrack(campaignId, id), invalidateKeys, onError });

  const reorderM = useMutation({
    mutationFn: (ids: string[]) => reorderTracks(campaignId, ids),
    onSuccess: (list) => queryClient.setQueryData(trackKeys.list(campaignId), list),
    onError,
  });

  const { mutateAsync: uploadAsync } = uploadM;

  const upload = useCallback(async (file: File) => {
    await uploadAsync(file).catch(() => undefined);
  }, [uploadAsync]);

  const { mutateAsync: youtubeAsync } = youtubeM;

  const addYoutube = useCallback(async (data: { url: string; title?: string }) => youtubeAsync(data).then(() => true, () => false), [youtubeAsync]);

  const { mutate: renameMutate } = renameM;

  const rename = useCallback((id: string, title: string) => renameMutate({ id, title }), [renameMutate]);

  const { mutate: deleteMutate } = deleteM;

  const remove = useCallback(
    async (track: CampaignTrack) => {
      if (await confirm({ title: `Видалити «${track.title}»?`, description: DELETE_NOTE[track.kind], confirmLabel: "Видалити", destructive: true })) {
        deleteMutate(track.id);
      }
    },
    [confirm, deleteMutate],
  );

  const { mutate: reorderMutate } = reorderM;

  const move = useCallback((index: number, dir: -1 | 1) => {
    const ids = tracks.map((t) => t.id);

    const next = moveTrack(ids, index, dir);

    if (next !== ids) reorderMutate(next);
  }, [tracks, reorderMutate]);

  return {
    tracks,
    loading: isLoading,
    busy: uploadM.isPending || youtubeM.isPending || reorderM.isPending,
    upload,
    addYoutube,
    rename,
    remove,
    move,
  };
}
