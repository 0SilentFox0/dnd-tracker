import { MapAimPanel } from "../MapAimPanel";

import { Portrait } from "@/components/battle/hud";
import type { useSpellBook } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

type Book = ReturnType<typeof useSpellBook>;

/** Поки гравець цілиться шаблоном, книга закрита, а карта лишається клікабельною; список зачеплених іде за курсором. */
export function SpellAimPanel({ book, spellName }: { book: Book; spellName: string }) {
  const { view, actions } = book;

  const { aimPreview } = view;

  return (
    <MapAimPanel
      ariaLabel="Наведення заклинання"
      title={spellName}
      hint="Оберіть точку на карті"
      footer={
        <>
          <button type="button" onClick={actions.back} className="hud-sc h-10 min-w-0 flex-1 whitespace-nowrap border border-white/20 px-2 text-sm">← Назад</button>
          <button type="button" onClick={actions.close} className="hud-sc h-10 min-w-0 flex-1 whitespace-nowrap border border-white/20 px-2 text-sm">Скасувати</button>
        </>
      }
    >
      {(slot) =>
        aimPreview && (
          <ul aria-label="Зачеплені" className={cn("mt-2 space-y-1 overflow-y-auto", slot ? "max-h-[76px]" : "max-h-40")}>
            {aimPreview.targets.length === 0 && <li className="text-sm italic text-[var(--hud-muted)]">Нікого не зачеплено</li>}
            {aimPreview.targets.map(({ participant, ally }) => (
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
