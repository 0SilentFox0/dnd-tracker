"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

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
        void notify("Оберіть хоча б одного учасника");

        return;
      }

      const body = { name: formData.name, description: formData.description, participants, map: map ?? null };

      if (battleId) {
        update.mutate(body, {
          onSuccess: () => navigateFresh(listHref),
          onError: (error) => void notify(error instanceof Error ? error.message : "Помилка при оновленні бою"),
        });

        return;
      }

      create.mutate(body, {
        onSuccess: (battle) => router.push(`${listHref}/${battle.id}`),
        onError: (error) => void notify(error instanceof Error ? error.message : "Помилка при створенні бою"),
      });
    },
    [battleId, formData.name, formData.description, participants, map, router, navigateFresh, notify, create, update, listHref],
  );

  const handleDelete = useCallback(async () => {
    if (!battleId) return;

    if (!(await confirm({ title: "Ви впевнені, що хочете видалити цю сцену бою?", confirmLabel: "Видалити", destructive: true }))) return;

    remove.mutate(battleId, {
      onSuccess: () => navigateFresh(listHref),
      onError: () => void notify("Помилка при видаленні бою"),
    });
  }, [battleId, confirm, remove, navigateFresh, listHref, notify]);

  return {
    status: { isSaving: battleId ? update.isPending : create.isPending, isDeleting: remove.isPending },
    actions: { submit: handleSubmit, remove: handleDelete },
  };
}
