"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useCreateBattle, useDeleteBattle, useUpdateBattle } from "../useBattles";

import { useConfirm, useNavigateFresh, useNotify } from "@/lib/hooks/common";
import type { BattleMapConfig, BattlePreparationParticipant } from "@/types/battle";

interface UseBattleFormParams {
  campaignId: string;
  battleId?: string;
  formData: { name: string; description: string };
  participants: BattlePreparationParticipant[];
  map?: BattleMapConfig | null;
}

export function useBattleForm({ campaignId, battleId, formData, participants, map }: UseBattleFormParams) {
  const t = useTranslations("battleSetup.form");

  const tActions = useTranslations("common.actions");

  const notify = useNotify();

  const confirm = useConfirm();

  const router = useRouter();

  const navigateFresh = useNavigateFresh();

  const create = useCreateBattle(campaignId);

  const update = useUpdateBattle(campaignId, battleId ?? "");

  const remove = useDeleteBattle(campaignId);

  const listHref = `/campaigns/${campaignId}/dm/battles`;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (participants.length === 0) {
        void notify(t("notify.noParticipants"));

        return;
      }

      const body = { name: formData.name, description: formData.description, participants, map: map ?? null };

      if (battleId) {
        update.mutate(body, {
          onSuccess: () => navigateFresh(listHref),
          onError: (error) => void notify(error instanceof Error ? error.message : t("notify.updateFailed")),
        });

        return;
      }

      create.mutate(body, {
        onSuccess: (battle) => router.push(`${listHref}/${battle.id}`),
        onError: (error) => void notify(error instanceof Error ? error.message : t("notify.createFailed")),
      });
    },
    [battleId, formData.name, formData.description, participants, map, router, navigateFresh, notify, create, update, listHref, t],
  );

  const handleDelete = useCallback(async () => {
    if (!battleId) return;

    if (!(await confirm({ title: t("confirmDelete"), confirmLabel: tActions("delete"), destructive: true }))) return;

    remove.mutate(battleId, {
      onSuccess: () => navigateFresh(listHref),
      onError: () => void notify(t("notify.deleteFailed")),
    });
  }, [battleId, confirm, remove, navigateFresh, listHref, notify, t, tActions]);

  return {
    status: { isSaving: battleId ? update.isPending : create.isPending, isDeleting: remove.isPending },
    actions: { submit: handleSubmit, remove: handleDelete },
  };
}
