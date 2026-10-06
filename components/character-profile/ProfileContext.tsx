"use client";

import { createContext, useContext } from "react";

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
