"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

import type { CharacterSheet } from "@/types/characters";

export interface ProfileContextValue {
  campaignId: string;
  characterId: string;
  sheet: CharacterSheet;
  canEdit: boolean;
}

export const ProfileContext = createContext<ProfileContextValue | null>(null);

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);

  if (!ctx) throw new Error("useProfile поза ProfileContext");

  return ctx;
}

export function ProfileProvider({ campaignId, characterId, sheet, canEdit, children }: ProfileContextValue & { children: ReactNode }) {
  const value = useMemo(() => ({ campaignId, characterId, sheet, canEdit }), [campaignId, characterId, sheet, canEdit]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
