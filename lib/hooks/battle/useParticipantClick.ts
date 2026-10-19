"use client";

import { useCallback, useEffect, useRef } from "react";

import { type AttackIntent, participantAttackIntent, type ParticipantClickScene } from "@/lib/utils/battle/flows";

export interface ParticipantClickInput extends ParticipantClickScene {
  select(id: string | null): void;
  requestAttack(intent: AttackIntent): void;
}

/** Стабільний обробник (рядки списку memo): ворог у свій хід — атака, інакше — вибір. */
export function useParticipantClick(input: ParticipantClickInput | null): (id: string) => void {
  const latest = useRef(input);

  useEffect(() => {
    latest.current = input;
  });

  return useCallback((id: string) => {
    const l = latest.current;

    if (!l) return;

    const intent = participantAttackIntent(l, id);

    if (intent) l.requestAttack(intent);
    else l.select(id);
  }, []);
}
