"use client";

import { useCallback,useState } from "react";

import type { Participant } from "./types";

export function useBattleParticipants() {
  const [participants, setParticipants] = useState<Participant[]>([]);

  const handleParticipantToggle = useCallback(
    (
      participantId: string,
      type: "character" | "unit",
      checked: boolean,
    ) => {
      setParticipants((prev) => {
        if (checked) {
          return [...prev, { id: participantId, type, side: "ally" as const }];
        }

        return prev.filter((p) => p.id !== participantId);
      });
    },
    [],
  );

  const handleSideChange = useCallback(
    (participantId: string, side: "ally" | "enemy") => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === participantId ? { ...p, side } : p)),
      );
    },
    [],
  );

  /** Додати учасника до вказаної сторони або перемістити існуючого. */
  const handleAddToSide = useCallback(
    (
      participantId: string,
      type: "character" | "unit",
      side: "ally" | "enemy",
      quantity?: number,
    ) => {
      setParticipants((prev) => {
        const existing = prev.find((p) => p.id === participantId);

        if (existing) {
          return prev.map((p) =>
            p.id === participantId
              ? {
                  ...p,
                  side,
                  ...(type === "unit" && {
                    quantity: quantity ?? p.quantity ?? 1,
                  }),
                }
              : p,
          );
        }

        return [
          ...prev,
          {
            id: participantId,
            type,
            side,
            ...(type === "unit" && { quantity: quantity ?? 1 }),
          },
        ];
      });
    },
    [],
  );

  /** Повністю видалити учасника зі списку. */
  const handleRemoveParticipant = useCallback((participantId: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== participantId));
  }, []);

  const handleQuantityChange = useCallback(
    (participantId: string, quantity: number) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === participantId ? { ...p, quantity } : p,
        ),
      );
    },
    [],
  );

  const isParticipantSelected = useCallback(
    (participantId: string) =>
      participants.some((p) => p.id === participantId),
    [participants],
  );

  const getParticipantQuantity = useCallback(
    (participantId: string): number =>
      participants.find((p) => p.id === participantId)?.quantity ?? 1,
    [participants],
  );

  const getParticipantSide = useCallback(
    (participantId: string): "ally" | "enemy" | null =>
      participants.find((p) => p.id === participantId)?.side ?? null,
    [participants],
  );

  const allyParticipants = {
    characterIds: participants
      .filter((p) => p.side === "ally" && p.type === "character")
      .map((p) => p.id),
    units: participants
      .filter((p) => p.side === "ally" && p.type === "unit")
      .map((p) => ({ id: p.id, quantity: p.quantity ?? 1 })),
  };

  const hasAllies =
    allyParticipants.characterIds.length > 0 ||
    allyParticipants.units.length > 0;

  return {
    participants,
    setParticipants,
    handleParticipantToggle,
    handleSideChange,
    handleAddToSide,
    handleRemoveParticipant,
    handleQuantityChange,
    isParticipantSelected,
    getParticipantQuantity,
    getParticipantSide,
    allyParticipants,
    hasAllies,
  };
}
