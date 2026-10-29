"use client";

import { useTranslations } from "next-intl";

import { HudPanel } from "@/components/hud/page";
import type { SheetTotal } from "@/types/characters";

interface CharacterHpPreviewProps {
  hp: SheetTotal;
}

export function CharacterHpPreview({ hp }: CharacterHpPreviewProps) {
  const t = useTranslations("characters.stats.hp");

  return (
    <HudPanel as="div" className="space-y-3">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold leading-none">{t("title")}</h3>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
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
