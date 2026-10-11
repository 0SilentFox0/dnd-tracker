"use client";

import { HeartPulse, Skull, X } from "lucide-react";

import { useDownedHeroPrompt } from "@/lib/hooks/battle";

export function DmRevivePrompt() {
  const { heroes, isPending, revive, dismiss } = useDownedHeroPrompt();

  if (heroes.length === 0) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md flex-col gap-2 animate-[hud-fade_.2s]">
      {heroes.map((p) => (
        <div key={p.basicInfo.id} role="alert" className="flex min-h-12 items-center gap-2.5 border border-hud-danger/50 bg-[#15110e]/95 px-3 text-sm text-[#d9cfbd]">
          <Skull className="size-4 shrink-0 text-hud-danger" />
          <span className="min-w-0 flex-1">
            <b className="hud-sc text-[var(--ink)]">{p.basicInfo.name}</b> впав. Повернути до життя з 1 HP?
          </span>
          <button
            type="button"
            disabled={isPending}
            onClick={() => revive(p)}
            className="flex h-8 shrink-0 items-center gap-1.5 border border-[var(--gold)]/50 px-2.5 text-[13px] text-[var(--gold)] hover:bg-[var(--gold)]/10 disabled:opacity-50"
          >
            <HeartPulse className="size-3.5" />
            Повернути
          </button>
          <button type="button" title="Сховати" onClick={() => dismiss(p)} className="flex size-8 shrink-0 items-center justify-center text-[var(--hud-muted)] hover:text-[var(--ink)]">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
