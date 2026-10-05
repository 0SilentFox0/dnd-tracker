"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { useCreateBattle } from "../useBattles";

import { useNotify } from "@/lib/hooks/common";
import type { SetupParticipant } from "@/types/battle-setup";

interface UseBattleFormParams {
  campaignId: string;
  formData: { name: string; description: string };
  participants: SetupParticipant[];
}

export function useBattleForm({ campaignId, formData, participants }: UseBattleFormParams) {
  const notify = useNotify();

  const router = useRouter();

  const create = useCreateBattle(campaignId);

  const { mutate } = create;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (participants.length === 0) {
        void notify("Оберіть хоча б одного учасника");

        return;
      }

      mutate(
        { name: formData.name, description: formData.description, participants },
        {
          onSuccess: (battle) => router.push(`/campaigns/${campaignId}/dm/battles/${battle.id}`),
          onError: (error) => void notify(error instanceof Error ? error.message : "Помилка при створенні бою"),
        },
      );
    },
    [campaignId, formData.name, formData.description, participants, router, notify, mutate],
  );

  return { loading: create.isPending, handleSubmit };
}
