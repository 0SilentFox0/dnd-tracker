import { createPortal } from "react-dom";
import { Crosshair } from "lucide-react";

import { useMapStripSlot } from "@/components/battle/scene/MapStrip";
import { HUD_SURFACE } from "@/components/hud";
import { cn } from "@/lib/utils";

/** Поки вміння наводиться на карту, вибір закритий; на телефоні панель стоїть у смузі під картою. */
export function AbilityAimPanel({ name, onCancel }: { name: string; onCancel: () => void }) {
  const slot = useMapStripSlot();

  const panel = (
    <div
      role="region"
      aria-label="Наведення вміння"
      className={cn(
        HUD_SURFACE,
        "text-[var(--ink)]",
        slot
          ? "flex items-center gap-3 pb-1"
          : "fixed inset-x-0 bottom-0 z-40 border-t border-white/25 bg-[#15110e]/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 lg:inset-x-auto lg:bottom-4 lg:left-4 lg:w-[300px] lg:border lg:pb-3",
      )}
    >
      <div className={cn("min-w-0", slot && "flex-1")}>
        <div className={cn("hud-sc truncate font-bold", slot ? "text-base" : "text-lg")}>{name}</div>
        <div className={cn("flex items-center gap-2 text-[var(--hud-muted)]", slot ? "text-xs" : "mt-1 text-sm")}>
          <Crosshair className="size-4" />
          Оберіть клітинку на карті
        </div>
      </div>
      <button type="button" onClick={onCancel} className={cn("hud-sc h-10 border border-white/20 px-3 text-sm", !slot && "mt-3 w-full")}>Скасувати</button>
    </div>
  );

  return slot ? createPortal(panel, slot) : panel;
}
