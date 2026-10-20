"use client";

import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { trackKeys } from "./keys";
import { useRenameTrack } from "./useRenameTrack";
import { useTracks } from "./useTracks";

import { createTrack, deleteTrack, reorderTracks, uploadTrackFile } from "@/lib/api/tracks";
import { TRACK_TITLE_MAX } from "@/lib/constants/music";
import { useConfirm, useCrudMutation, useNotify } from "@/lib/hooks/common";
import { moveTrack } from "@/lib/utils/audio/order";
import { readAudioDuration } from "@/lib/utils/audio/read-duration";
import { errorMessage } from "@/lib/utils/common/error-message";
import type { CampaignTrack } from "@/types/audio";

export interface MusicLibrary {
  tracks: CampaignTrack[];
  isLoading: boolean;
  isBusy: boolean;
  upload(file: File): Promise<void>;
  addYoutube(data: { url: string; title?: string }): Promise<boolean>;
  rename(id: string, title: string): void;
  remove(track: CampaignTrack): Promise<void>;
  move(index: number, dir: -1 | 1): void;
}

const stripExtension = (name: string) => name.replace(/\.[^.]+$/, "").slice(0, TRACK_TITLE_MAX) || "Трек";

// у стані бою лише знімок треку: YouTube грає далі, а файл зі сховища зникає одразу
const DELETE_NOTE: Record<CampaignTrack["kind"], string> = {
  file: "Трек зникне з бібліотеки, а файл — зі сховища. Якщо він зараз грає в бою, музика зупиниться для всіх.",
  youtube: "Трек зникне з бібліотеки.",
};

export function useMusicLibrary(campaignId: string, initial: CampaignTrack[]): MusicLibrary {
  const queryClient = useQueryClient();

  const confirm = useConfirm();

  const notify = useNotify();

  const { data: tracks = initial, isLoading } = useTracks(campaignId, { initial });

  const onError = useCallback((e: unknown) => void notify(errorMessage(e, "Не вдалося зберегти")), [notify]);

  const invalidateKeys = [trackKeys.list(campaignId)];

  const { mutateAsync: uploadAsync, isPending: isUploading } = useCrudMutation({
    mutationFn: async (file: File) => uploadTrackFile(campaignId, file, { title: stripExtension(file.name), durationSec: await readAudioDuration(file) }),
    invalidateKeys,
    onError,
  });

  const { mutateOk: addYoutube, isPending: isAddingYoutube } = useCrudMutation({ mutationFn: (data: { url: string; title?: string }) => createTrack(campaignId, { kind: "youtube", ...data }), invalidateKeys, onError });

  const { mutate: deleteMutate } = useCrudMutation({ mutationFn: (id: string) => deleteTrack(campaignId, id), invalidateKeys, onError });

  const { mutate: reorderMutate, isPending: isReordering } = useCrudMutation({
    mutationFn: (ids: string[]) => reorderTracks(campaignId, ids),
    onSuccess: (list) => queryClient.setQueryData(trackKeys.list(campaignId), list),
    onError,
  });

  // помилку вже показав onError — сторінці лишається лише дочекатися
  const upload = useCallback(async (file: File) => {
    await uploadAsync(file).catch(() => undefined);
  }, [uploadAsync]);

  const rename = useRenameTrack(campaignId, onError);

  const remove = useCallback(
    async (track: CampaignTrack) => {
      if (await confirm({ title: `Видалити «${track.title}»?`, description: DELETE_NOTE[track.kind], confirmLabel: "Видалити", destructive: true })) {
        deleteMutate(track.id);
      }
    },
    [confirm, deleteMutate],
  );

  const move = useCallback((index: number, dir: -1 | 1) => {
    const ids = tracks.map((t) => t.id);

    const next = moveTrack(ids, index, dir);

    if (next !== ids) reorderMutate(next);
  }, [tracks, reorderMutate]);

  const isBusy = isUploading || isAddingYoutube || isReordering;

  return useMemo(
    () => ({ tracks, isLoading, isBusy, upload, addYoutube, rename, remove, move }),
    [tracks, isLoading, isBusy, upload, addYoutube, rename, remove, move],
  );
}
