"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { useCreateBattle, useDeleteBattle, useUpdateBattle } from "../useBattles";

import { useConfirm, useNotify } from "@/lib/hooks/common";
import type { BattlePreparationParticipant } from "@/types/battle";

interface UseBattleFormParams {
  campaignId: string;
  battleId?: string;
  formData: { name: string; description: string };
  participants: BattlePreparationParticipant[];
}

export function useBattleForm({ campaignId, battleId, formData, participants }: UseBattleFormParams) {
  const notify = useNotify();

  const confirm = useConfirm();

  const router = useRouter();

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

      const body = { name: formData.name, description: formData.description, participants };

      if (battleId) {
        update.mutate(body, {
          onSuccess: () => {
            router.push(listHref);
            router.refresh();
          },
          onError: () => void notify("Помилка при оновленні бою"),
        });

        return;
      }

      create.mutate(body, {
        onSuccess: (battle) => router.push(`${listHref}/${battle.id}`),
        onError: (error) => void notify(error instanceof Error ? error.message : "Помилка при створенні бою"),
      });
    },
    [battleId, formData.name, formData.description, participants, router, notify, create, update, listHref],
  );

  const handleDelete = useCallback(async () => {
    if (!battleId) return;

    if (!(await confirm({ title: "Ви впевнені, що хочете видалити цю сцену бою?", confirmLabel: "Видалити", destructive: true }))) return;

    remove.mutate(battleId, {
      onSuccess: () => {
        router.push(listHref);
        router.refresh();
      },
      onError: () => void notify("Помилка при видаленні бою"),
    });
  }, [battleId, confirm, remove, router, listHref, notify]);

  return {
    saving: battleId ? update.isPending : create.isPending,
    deleting: remove.isPending,
    handleSubmit,
    handleDelete,
  };
}
