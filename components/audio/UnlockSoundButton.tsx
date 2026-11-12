"use client";

import { useTranslations } from "next-intl";

import { usePlayerAudio } from "@/lib/hooks/audio";
import { cn } from "@/lib/utils";

/** Той самий вигляд, що й «Наступний хід». */
export function UnlockSoundButton({ className }: { className?: string }) {
  const t = useTranslations("music");

  const { sound } = usePlayerAudio();

  return (
    <button type="button" className={cn("hud-sc flex h-8 items-center justify-center bg-[var(--enemy,#9c2a1d)] text-sm text-[#fffaf0]", className)} onClick={sound.unlock}>
      {t("player.unlock")}
    </button>
  );
}
