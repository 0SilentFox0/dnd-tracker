import { createPortal } from "react-dom";
import { Crosshair } from "lucide-react";

import { Portrait } from "@/components/battle/hud";
import { useMapStripSlot } from "@/components/battle/scene/MapStrip";
import { HUD_SURFACE } from "@/components/hud";
import type { useSpellBook } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

type Book = ReturnType<typeof useSpellBook>;

/** Поки гравець цілиться шаблоном, книга закрита, а карта лишається клікабельною; на телефоні панель стоїть у смузі під картою, а не поверх неї. */
export function SpellAimPanel({ book, spellName }: { book: Book; spellName: string }) {
  const { state, view, actions } = book;

  const { aimTargets } = view;

  const slot = useMapStripSlot();

  const panel = (
    <div
      role="region"
      aria-label="Наведення заклинання"
      className={cn(
        HUD_SURFACE,
        "text-[var(--ink)]",
        slot
          ? "pb-1"
          : "fixed inset-x-0 bottom-0 z-40 border-t border-white/25 bg-[#15110e]/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 lg:inset-x-auto lg:bottom-4 lg:left-4 lg:w-[300px] lg:border lg:pb-3",
      )}
    >
      <div className={cn(slot && "flex items-baseline gap-3")}>
        <div className={cn("hud-sc font-bold", slot ? "truncate text-base" : "text-lg")}>{spellName}</div>
        <div className={cn("flex shrink-0 items-center gap-2 text-[var(--hud-muted)]", slot ? "text-xs" : "mt-1 text-sm")}>
          <Crosshair className="size-4" />
          Оберіть точку на карті
        </div>
      </div>
      {state.aim && (
        <ul className={cn("mt-2 space-y-1 overflow-y-auto", slot ? "max-h-[76px]" : "max-h-40")}>
          {aimTargets.length === 0 && <li className="text-sm italic text-[var(--hud-muted)]">Нікого не зачеплено</li>}
          {aimTargets.map(({ participant, ally }) => (
            <li key={participant.basicInfo.id} className="flex h-9 items-center gap-2">
              <Portrait participant={participant} size={24} />
              <span className="hud-sc text-sm font-bold">{participant.basicInfo.name}</span>
              {ally && <span className="ml-auto text-xs text-hud-gold-bright">⚠ союзник</span>}
            </li>
          ))}
        </ul>
      )}
      <div className={cn("grid grid-cols-2 gap-2", slot ? "mt-2" : "mt-3")}>
        <button type="button" onClick={actions.back} className="hud-sc h-10 min-w-0 whitespace-nowrap border border-white/20 px-2 text-sm">← Назад</button>
        <button type="button" onClick={actions.close} className="hud-sc h-10 min-w-0 whitespace-nowrap border border-white/20 px-2 text-sm">Скасувати</button>
      </div>
    </div>
  );

  return slot ? createPortal(panel, slot) : panel;
}
