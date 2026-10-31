"use client";

import { createContext, type ReactNode, useContext } from "react";
import { usePathname } from "next/navigation";

import { ThemePortalClassProvider } from "@/components/ui/portal-class";
import { usePaletteState } from "@/lib/hooks/theme";

const ThemeContext = createContext<ReturnType<typeof usePaletteState> | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = usePaletteState(usePathname() ?? "/");

  return <ThemeContext.Provider value={theme}><ThemePortalClassProvider value="palette-popover">{children}</ThemePortalClassProvider></ThemeContext.Provider>;
}

export function useTheme() {
  const theme = useContext(ThemeContext);

  if (!theme) throw new Error("useTheme requires ThemeProvider");

  return theme;
}
