"use client";

import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { trackKeys } from "./keys";
import { useRenameTrack } from "./useRenameTrack";
import { useTracks } from "./useTracks";

import { createTrack, deleteTrack, reorderTracks, updateTrack, uploadTrackFile } from "@/lib/api/tracks";
import { TRACK_TITLE_MAX } from "@/lib/constants/music";
import { useConfirm, useCrudMutation, useNotify } from "@/lib/hooks/common";
import { translateIssue } from "@/lib/i18n/translate-issue";
import { useTranslator } from "@/lib/i18n/use-translator";
import { moveTrackInGroup } from "@/lib/utils/audio/order";
import { readAudioDuration } from "@/lib/utils/audio/read-duration";
import { errorMessage } from "@/lib/utils/common/error-message";
import type { CampaignTrack, UpdateTrackData } from "@/types/audio";

export interface MusicLibrary {
  tracks: CampaignTrack[];
  isLoading: boolean;
  isBusy: boolean;
  upload(file: File): Promise<void>;
  addYoutube(data: { url: string; title?: string }): Promise<boolean>;
  rename(id: string, title: string): void;
  update(id: string, patch: UpdateTrackData): Promise<boolean>;
  remove(track: CampaignTrack): Promise<void>;
  move(id: string, dir: -1 | 1): void;
}

const stripExtension = (name: string, fallback: string) => name.replace(/\.[^.]+$/, "").slice(0, TRACK_TITLE_MAX) || fallback;

// у стані бою лише знімок треку: YouTube грає далі, а файл зі сховища зникає одразу
const DELETE_NOTE_KEYS = { file: "music.library.deleteNote.file", youtube: "music.library.deleteNote.youtube" } as const;

export function useMusicLibrary(campaignId: string, initial: CampaignTrack[]): MusicLibrary {
  const queryClient = useQueryClient();

  const confirm = useConfirm();

  const notify = useNotify();

  const t = useTranslator();

  const { data: tracks = initial, isLoading } = useTracks(campaignId, { initial });

  const onError = useCallback((e: unknown) => void notify(translateIssue(t, { message: errorMessage(e, "music.library.saveFailed") })), [notify, t]);

  const invalidateKeys = [trackKeys.list(campaignId)];

  const { mutateAsync: uploadAsync, isPending: isUploading } = useCrudMutation({
    mutationFn: async (file: File) => uploadTrackFile(campaignId, file, { title: stripExtension(file.name, t("music.library.defaultTitle")), durationSec: await readAudioDuration(file) }),
    invalidateKeys,
    onError,
  });

  const { mutateOk: addYoutube, isPending: isAddingYoutube } = useCrudMutation({ mutationFn: (data: { url: string; title?: string }) => createTrack(campaignId, { kind: "youtube", ...data }), invalidateKeys, onError });

  const { mutateOk: update, isPending: isUpdating } = useCrudMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateTrackData }) => updateTrack(campaignId, id, patch),
    invalidateKeys,
    onError,
  });

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
      if (await confirm({ title: t("music.library.deleteTitle", { title: track.title }), description: t(DELETE_NOTE_KEYS[track.kind]), confirmLabel: t("common.actions.delete"), destructive: true })) {
        deleteMutate(track.id);
      }
    },
    [confirm, deleteMutate, t],
  );

  const move = useCallback((id: string, dir: -1 | 1) => {
    const next = moveTrackInGroup(tracks, id, dir);

    if (next) reorderMutate(next);
  }, [tracks, reorderMutate]);

  const updateTrackFields = useCallback((id: string, patch: UpdateTrackData) => update({ id, patch }), [update]);

  const isBusy = isUploading || isAddingYoutube || isReordering || isUpdating;

  return useMemo(
    () => ({ tracks, isLoading, isBusy, upload, addYoutube, rename, update: updateTrackFields, remove, move }),
    [tracks, isLoading, isBusy, upload, addYoutube, rename, updateTrackFields, remove, move],
  );
}
