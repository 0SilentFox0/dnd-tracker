"use client";

import { useTranslations } from "next-intl";

import { PATH_HEADER_CLASS } from "./header";

import { HudPill } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { classLevels, pathSummary } from "@/lib/utils/characters/classes/path";
import type { ClassProgression } from "@/types/classes";

interface ClassesHeaderProps {
  progressions: readonly ClassProgression[];
  maxLevel: number;
  onAddClass?: () => void;
}

export function ClassesHeader({ progressions, maxLevel, onAddClass }: ClassesHeaderProps) {
  const t = useTranslations("characterProfile.path");

  const levels = classLevels(progressions);

  const total = levels.reduce((sum, c) => sum + c.level, 0);

  const open = progressions.reduce((sum, p) => sum + pathSummary(p).open, 0);

  return (
    <header className={cn(PATH_HEADER_CLASS, "-mx-4 mb-3 flex-wrap gap-2")}>
      <span className="hud-sc flex flex-wrap items-center gap-2 text-base text-hud-ink">
        {t("classesSummary", { level: total, split: levels.map((c) => `${c.className} ${c.level}`).join(" / ") })}
        {open > 0 ? <HudPill tone="accent">{t("openPicks", { count: open })}</HudPill> : null}
      </span>
      {onAddClass && total < maxLevel ? (
        <Button type="button" size="sm" variant="outline" onClick={onAddClass}>
          {t("addClass")}
        </Button>
      ) : null}
    </header>
  );
}
