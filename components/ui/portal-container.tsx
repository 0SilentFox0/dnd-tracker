"use client";

import { createContext, type ReactNode, useContext } from "react";

const PortalContainer = createContext<HTMLElement | null>(null);

export function PortalContainerProvider({ value, children }: { value: HTMLElement | null; children: ReactNode }) {
  return <PortalContainer.Provider value={value}>{children}</PortalContainer.Provider>;
}

export function usePortalContainer(): HTMLElement | undefined {
  return useContext(PortalContainer) ?? undefined;
}
