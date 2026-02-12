"use client";

import { useCallback,useState } from "react";
import { useRouter } from "next/navigation";

import type { Participant } from "./types";

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
  setFormData,
  participants,
}: UseBattleFormParams) {
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
        const response = await fetch(`/api/campaigns/${campaignId}/battles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            participants,
          }),
        });

        if (!response.ok) {
          const error = await response.json();

          throw new Error(error.error || "Помилка при створенні бою");
        }

        const battle = await response.json();

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
