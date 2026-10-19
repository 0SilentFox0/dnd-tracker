import { MapAimPanel } from "../MapAimPanel";

import { Portrait } from "@/components/battle/hud";
import type { useSpellBook } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

type Book = ReturnType<typeof useSpellBook>;

/** Поки гравець цілиться шаблоном, книга закрита, а карта лишається клікабельною. */
export function SpellAimPanel({ book, spellName }: { book: Book; spellName: string }) {
  const { state, view, actions } = book;

  const { aimTargets, aimConfirmable } = view;

  return (
    <MapAimPanel
      ariaLabel="Наведення заклинання"
      title={spellName}
      hint="Оберіть точку на карті"
      footer={
        <>
          <button type="button" onClick={actions.back} className="hud-sc h-10 border border-white/20 px-3 text-sm">← Назад</button>
          <button type="button" onClick={actions.close} className="hud-sc h-10 border border-white/20 px-3 text-sm">Скасувати</button>
          <button type="button" disabled={!aimConfirmable} onClick={actions.confirmTargets} className="hud-sc h-10 flex-1 bg-[#7a2a1f] text-sm text-[#f3e7cc] disabled:opacity-50">Підтвердити</button>
        </>
      }
    >
      {(slot) =>
        state.aim && (
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
        )
      }
    </MapAimPanel>
  );
}
