"use client";

import { useBattleScene } from "@/lib/hooks/battle";

export function ConnectionBanner() {
  const { connection } = useBattleScene();

  if (connection !== "disconnected" && connection !== "unavailable") return null;

  return (
    <div className="flex h-9 items-center justify-center gap-2 bg-[#5a3a12] text-[13px] text-[#f3d9a4]">
      <i className="size-2 rounded-full bg-[#f0b44c] animate-[hud-pulse_1.2s_infinite]" />
      Немає зв&apos;язку — стан може бути застарілим
    </div>
  );
}
