"use client";

import { createContext, useContext, useState } from "react";

import { buildParticipantFaces, type ParticipantFace } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

export const ParticipantFacesContext = createContext<Map<string, ParticipantFace> | null>(null);

const compositionKey = (order: BattleParticipant[]) => order.map((p) => `${p.basicInfo.id}\u0001${p.basicInfo.name}\u0001${p.basicInfo.avatar ?? ""}`).join("\u0002");

/** Та сама мапа, поки не змінився склад (id/ім'я/аватар) — дельти HP не перемальовують портрети ефектів. */
export function useParticipantFacesValue(order: BattleParticipant[]): Map<string, ParticipantFace> {
  const key = compositionKey(order);

  const [state, setState] = useState(() => ({ key, faces: buildParticipantFaces(order) }));

  if (state.key !== key) {
    const next = { key, faces: buildParticipantFaces(order) };

    setState(next);

    return next.faces;
  }

  return state.faces;
}

export function useParticipantFace(id: string | undefined): ParticipantFace | undefined {
  const faces = useContext(ParticipantFacesContext);

  return id ? faces?.get(id) : undefined;
}
