"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import type { Participant } from "./types";

import { createBattle } from "@/lib/api/battles";

interface UseBattleFormParams {
  campaignId: string;
  formData: { name: string; description: string };
  setFormData: React.Dispatch<
    React.SetStateAction<{ name: string; description: string }>
  >;
  participants: Participant[];
}

export function useBattleForm({
  campaignId,
  formData,
  setFormData: _setFormData,
  participants,
}: UseBattleFormParams) {
  void _setFormData;

  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (participants.length === 0) {
        alert("Оберіть хоча б одного учасника");

        return;
      }

      setLoading(true);
      try {
        const battle = await createBattle(campaignId, {
          name: formData.name,
          description: formData.description,
          participants,
        });

        router.push(`/campaigns/${campaignId}/dm/battles/${battle.id}`);
      } catch (error) {
        console.error("Error creating battle:", error);
        alert(
          error instanceof Error ? error.message : "Помилка при створенні бою",
        );
      } finally {
        setLoading(false);
      }
    },
    [campaignId, formData.name, formData.description, participants, router],
  );

  return { loading, handleSubmit };
}
