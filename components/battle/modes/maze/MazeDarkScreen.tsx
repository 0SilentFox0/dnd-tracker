"use client";

import { useTranslations } from "next-intl";

import { Portrait } from "@/components/battle/hud";
import type { BattleParticipant } from "@/types/battle";

export function MazeDarkScreen({ own }: { own: BattleParticipant[] }) {
  const t = useTranslations("battleDm.maze");

  return (
    <div data-maze-dark="" className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black">
      <div className="flex gap-3">
        {own.map((p) => (
          <Portrait key={p.basicInfo.id} participant={p} size={72} />
        ))}
      </div>
      <p className="hud-sc text-lg tracking-widest text-[var(--hud-muted)]">{t("darkScreen")}</p>
    </div>
  );
}
