"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

import type { BattleParticipant } from "@/types/battle";

export interface ParticipantFace {
  name: string;
  avatar?: string;
}

const Faces = createContext<Map<string, ParticipantFace>>(new Map());

/** Аватари учасників для іконок ефектів; значення змінюється лише зі складом бою, а не з кожною дельтою. */
export function ParticipantFacesProvider({ order, children }: { order: BattleParticipant[]; children: ReactNode }) {
  const key = order.map((p) => `${p.basicInfo.id}\u0000${p.basicInfo.avatar ?? ""}\u0000${p.basicInfo.name}`).join("\u0001");

  // eslint-disable-next-line react-hooks/exhaustive-deps -- ключ описує все, що потрібно з order
  const faces = useMemo(() => new Map(order.map((p) => [p.basicInfo.id, { name: p.basicInfo.name, avatar: p.basicInfo.avatar }])), [key]);

  return <Faces.Provider value={faces}>{children}</Faces.Provider>;
}

export function useParticipantFace(id: string | undefined): ParticipantFace | undefined {
  const faces = useContext(Faces);

  return id ? faces.get(id) : undefined;
}
