"use client";

import { createContext, type ReactNode, useContext } from "react";

const HudPortalClass = createContext<string | null>(null);

export function HudPortalClassProvider({ value, children }: { value: string | null; children: ReactNode }) {
  return <HudPortalClass.Provider value={value}>{children}</HudPortalClass.Provider>;
}

export function useHudPortalClass(): string | undefined {
  return useContext(HudPortalClass) ?? undefined;
}
