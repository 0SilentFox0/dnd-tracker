"use client";

import { useMemo, useState } from "react";

import { ParticipantSide, ParticipantSourceType, type ParticipantSourceTypeValue } from "@/lib/constants/battle";
import type { BattlePreparationParticipant } from "@/types/battle";

export interface AllyParticipants {
  characterIds: string[];
  units: { id: string; quantity: number }[];
}

export interface ParticipantSelection {
  isSelected: (participantId: string) => boolean;
  sideOf: (participantId: string) => ParticipantSide | null;
  quantityOf: (participantId: string) => number;
}

export interface ParticipantActions {
  toggle: (participantId: string, type: ParticipantSourceTypeValue, checked: boolean) => void;
  setSide: (participantId: string, side: ParticipantSide) => void;
  addToSide: (participantId: string, type: ParticipantSourceTypeValue, side: ParticipantSide, quantity?: number) => void;
  remove: (participantId: string) => void;
  setQuantity: (participantId: string, quantity: number) => void;
  setReserve: (participantId: string, reserved: number) => void;
}

export function useBattleParticipants(initial: BattlePreparationParticipant[] = []) {
  const [list, setList] = useState<BattlePreparationParticipant[]>(initial);

  const actions = useMemo<ParticipantActions>(
    () => ({
      toggle: (participantId, type, checked) =>
        setList((prev) => (checked ? [...prev, { id: participantId, type, side: ParticipantSide.ALLY }] : prev.filter((p) => p.id !== participantId))),
      setSide: (participantId, side) => setList((prev) => prev.map((p) => (p.id === participantId ? { ...p, side } : p))),
      addToSide: (participantId, type, side, quantity) =>
        setList((prev) => {
          const existing = prev.find((p) => p.id === participantId);

          if (existing) {
            return prev.map((p) =>
              p.id === participantId
                ? {
                    ...p,
                    side,
                    ...(type === ParticipantSourceType.UNIT && {
                      quantity: quantity ?? p.quantity ?? 1,
                      ...(p.reserved !== undefined && { reserved: Math.min(p.reserved, quantity ?? p.quantity ?? 1) }),
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
        }),
      remove: (participantId) => setList((prev) => prev.filter((p) => p.id !== participantId)),
      setQuantity: (participantId, quantity) =>
        setList((prev) =>
          prev.map((p) => (p.id === participantId ? { ...p, quantity, ...(p.reserved !== undefined && { reserved: Math.min(p.reserved, quantity) }) } : p)),
        ),
      setReserve: (participantId, reserved) =>
        setList((prev) => prev.map((p) => (p.id === participantId ? { ...p, reserved: Math.max(0, Math.min(reserved, p.quantity ?? 1)) } : p))),
    }),
    [],
  );

  const selection = useMemo<ParticipantSelection>(
    () => ({
      isSelected: (participantId) => list.some((p) => p.id === participantId),
      sideOf: (participantId) => list.find((p) => p.id === participantId)?.side ?? null,
      quantityOf: (participantId) => list.find((p) => p.id === participantId)?.quantity ?? 1,
    }),
    [list],
  );

  const allyParticipants: AllyParticipants = {
    characterIds: list
      .filter((p) => p.side === ParticipantSide.ALLY && p.type === ParticipantSourceType.CHARACTER)
      .map((p) => p.id),
    units: list
      .filter((p) => p.side === ParticipantSide.ALLY && p.type === ParticipantSourceType.UNIT)
      .map((p) => ({ id: p.id, quantity: p.quantity ?? 1 })),
  };

  const allies = {
    value: allyParticipants,
    exists: allyParticipants.characterIds.length > 0 || allyParticipants.units.length > 0,
  };

  return { list, setList, selection, actions, allies };
}
