"use client";

import "@/components/hud/hud.css";

import type { ReactNode } from "react";

import { HUD_SURFACE } from "@/components/hud";
import { HudPortalClassProvider } from "@/components/ui/portal-class";
import { cn } from "@/lib/utils";

const WIDTH = { md: "max-w-4xl", lg: "max-w-6xl" } as const;

export function HudPage({ width = "lg", className, children }: { width?: keyof typeof WIDTH; className?: string; children: ReactNode }) {
  return (
    <div className={cn(HUD_SURFACE, "hud-page mx-auto w-full space-y-3 px-3 py-4 sm:px-4", WIDTH[width], className)}>
      <HudPortalClassProvider value={HUD_SURFACE}>{children}</HudPortalClassProvider>
    </div>
  );
}
