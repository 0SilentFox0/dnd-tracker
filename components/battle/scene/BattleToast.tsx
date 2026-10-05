"use client";

import { useBattleScene } from "@/lib/hooks/battle";

export function BattleToast() {
  const { toast } = useBattleScene();

  if (!toast.message) return null;

  return (
    <button type="button" onClick={toast.dismiss} role="status" className="fixed inset-x-4 top-14 z-50 mx-auto flex min-h-11 max-w-md items-center gap-2.5 border border-white/25 bg-[#15110e]/95 px-3.5 text-left text-sm text-[#d9cfbd] animate-[hud-fade_.2s]">
      {toast.message}
    </button>
  );
}
