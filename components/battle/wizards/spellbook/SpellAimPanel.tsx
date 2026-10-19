import { Crosshair } from "lucide-react";

import { Portrait } from "@/components/battle/hud";
import { HUD_SURFACE } from "@/components/hud";
import type { useSpellBook } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

type Book = ReturnType<typeof useSpellBook>;

/** Поки гравець цілиться шаблоном, книга закрита, а карта лишається клікабельною. */
export function SpellAimPanel({ book, spellName }: { book: Book; spellName: string }) {
  const { state, view, actions } = book;

  const { aimTargets } = view;

  return (
    <div
      role="region"
      aria-label="Наведення заклинання"
      className={cn(
        HUD_SURFACE,
        "fixed inset-x-0 bottom-0 z-40 border-t border-white/25 bg-[#15110e]/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 text-[var(--ink)] lg:inset-x-auto lg:bottom-4 lg:left-4 lg:w-[300px] lg:border lg:pb-3",
      )}
    >
      <div className="hud-sc text-lg font-bold">{spellName}</div>
      <div className="mt-1 flex items-center gap-2 text-sm text-[var(--hud-muted)]">
        <Crosshair className="size-4" />
        Оберіть точку на карті
      </div>
      {state.aim && (
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
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
      <div className="mt-3 grid grid-cols-[auto_auto_1fr] gap-2">
        <button type="button" onClick={actions.back} className="hud-sc h-10 border border-white/20 px-3 text-sm">← Назад</button>
        <button type="button" onClick={actions.close} className="hud-sc h-10 border border-white/20 px-3 text-sm">Скасувати</button>
        <button type="button" disabled={!state.aim} onClick={actions.confirmTargets} className="hud-sc h-10 bg-[#7a2a1f] text-sm text-[#f3e7cc] disabled:opacity-50">Підтвердити</button>
      </div>
    </div>
  );
}
