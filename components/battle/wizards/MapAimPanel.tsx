import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Crosshair } from "lucide-react";

import { useMapStripSlot } from "@/components/battle/scene/MapStrip";
import { HUD_SURFACE } from "@/components/hud";
import { cn } from "@/lib/utils";

interface MapAimPanelProps {
  ariaLabel: string;
  title: string;
  hint: string;
  children?: (slot: boolean) => ReactNode;
  footer: ReactNode;
}

/** На телефоні панель стоїть у смузі під картою, а не поверх неї. */
export function MapAimPanel({ ariaLabel, title, hint, children, footer }: MapAimPanelProps) {
  const slot = useMapStripSlot();

  const panel = (
    <div
      role="region"
      aria-label={ariaLabel}
      className={cn(
        HUD_SURFACE,
        "text-[var(--ink)]",
        slot
          ? "pb-1"
          : "fixed inset-x-0 bottom-0 z-40 border-t border-white/25 bg-[#15110e]/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 lg:inset-x-auto lg:bottom-4 lg:left-4 lg:w-[300px] lg:border lg:pb-3",
      )}
    >
      <div className={cn(slot && "flex items-baseline gap-3")}>
        <div className={cn("hud-sc font-bold", slot ? "truncate text-base" : "text-lg")}>{title}</div>
        <div className={cn("flex shrink-0 items-center gap-2 text-[var(--hud-muted)]", slot ? "text-xs" : "mt-1 text-sm")}>
          <Crosshair className="size-4" />
          {hint}
        </div>
      </div>
      {children?.(!!slot)}
      <div className={cn("flex gap-2", slot ? "mt-2" : "mt-3")}>{footer}</div>
    </div>
  );

  return slot ? createPortal(panel, slot) : panel;
}
