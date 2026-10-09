"use client";

import { HudPanel } from "@/components/hud/page";
import type { SheetTotal } from "@/types/characters";

interface CharacterHpPreviewProps {
  hp: SheetTotal;
}

export function CharacterHpPreview({ hp }: CharacterHpPreviewProps) {
  return (
    <HudPanel as="div" className="space-y-3">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold leading-none">Здоровʼя (HP)</h3>
            <p className="text-sm text-muted-foreground">Як у бою: рівень, статура, архетип і бонуси. Оновлюється після збереження.</p>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-2xl font-semibold tabular-nums">{hp.total}</p>
        {hp.lines.length > 0 && (
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {hp.lines.map((line, i) => (
              <li key={i}>{line.value ? `${line.label} ${line.value}` : line.label}</li>
            ))}
          </ul>
        )}
      </div>
    </HudPanel>
  );
}
