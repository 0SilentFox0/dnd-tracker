"use client";

import type { ReactNode } from "react";

import "@/components/hud/hud.css";
import { HUD_SURFACE } from "@/components/hud";
import { HudPortalClassProvider } from "@/components/ui/portal-class";
import { cn } from "@/lib/utils";

export function HudFormPage({ title, aside, children, className }: { title: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn(HUD_SURFACE, "hud-form hud-form-page mx-auto flex min-h-dvh w-full max-w-3xl flex-col sm:my-4 sm:min-h-0 sm:rounded-xl", className)}>
      <header className="flex flex-col gap-1 border-b border-[rgba(230,220,203,.14)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <h1 className="hud-sc text-[17px] text-[#efe5d2]">{title}</h1>
        {aside && <span className="text-xs text-[#8f8473] sm:text-sm sm:text-[#b8ab95]">{aside}</span>}
      </header>
      <HudPortalClassProvider value={HUD_SURFACE}>{children}</HudPortalClassProvider>
    </div>
  );
}
