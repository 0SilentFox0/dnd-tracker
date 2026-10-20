"use client";

import { useBattleAudio } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

/** Той самий вигляд, що й «Наступний хід». */
export function UnlockSoundButton({ className }: { className?: string }) {
  const { sound } = useBattleAudio();

  return (
    <button type="button" className={cn("hud-sc flex h-8 items-center justify-center bg-[var(--enemy)] text-sm text-[var(--ink)]", className)} onClick={sound.unlock}>
      Увімкнути звук
    </button>
  );
}
