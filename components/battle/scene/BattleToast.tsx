"use client";

import { useBattleScene } from "@/lib/hooks/battle";

export function BattleToast() {
  const { toast } = useBattleScene();

  if (!toast.message) return null;

  return (
    <button type="button" onClick={toast.dismiss} role="status" className="flex min-h-11 w-full items-center gap-2.5 border border-white/25 bg-hud-surface/95 px-3.5 text-left text-sm text-hud-text animate-[hud-fade_.2s]">
      {toast.message}
    </button>
  );
}
