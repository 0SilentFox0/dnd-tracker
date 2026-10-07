"use client";

import { useCallback, useState } from "react";

import { ParticipantSide, ParticipantSourceType, type ParticipantSourceTypeValue } from "@/lib/constants/battle";
import type { BattlePreparationParticipant } from "@/types/battle";

export function useBattleParticipants(initial: BattlePreparationParticipant[] = []) {
  const [participants, setParticipants] = useState<BattlePreparationParticipant[]>(initial);

  const handleParticipantToggle = useCallback(
    (
      participantId: string,
      type: ParticipantSourceTypeValue,
      checked: boolean,
    ) => {
      setParticipants((prev) => {
        if (checked) {
          return [...prev, { id: participantId, type, side: ParticipantSide.ALLY }];
        }

        return prev.filter((p) => p.id !== participantId);
      });
    },
    [],
  );

  const handleSideChange = useCallback(
    (participantId: string, side: ParticipantSide) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === participantId ? { ...p, side } : p)),
      );
    },
    [],
  );

  const handleAddToSide = useCallback(
    (
      participantId: string,
      type: ParticipantSourceTypeValue,
      side: ParticipantSide,
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
                  ...(type === ParticipantSourceType.UNIT && {
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
            ...(type === ParticipantSourceType.UNIT && { quantity: quantity ?? 1 }),
          },
        ];
      });
    },
    [],
  );

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
    (participantId: string): ParticipantSide | null =>
      participants.find((p) => p.id === participantId)?.side ?? null,
    [participants],
  );

  const allyParticipants = {
    characterIds: participants
      .filter((p) => p.side === ParticipantSide.ALLY && p.type === ParticipantSourceType.CHARACTER)
      .map((p) => p.id),
    units: participants
      .filter((p) => p.side === ParticipantSide.ALLY && p.type === ParticipantSourceType.UNIT)
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
