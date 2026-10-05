"use client";

import { BookOpen, Hourglass, Sparkles, Swords } from "lucide-react";

import type { usePlayerTurn } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

type Turn = ReturnType<typeof usePlayerTurn>;

const Tile = ({ icon: Icon, label, sub, used, primary, onClick }: { icon: typeof Swords; label: string; sub: string; used?: boolean; primary?: boolean; onClick?: () => void }) => (
  <button type="button" disabled={used} onClick={onClick} className={cn("flex h-16 items-center gap-3 border px-3.5 text-left text-[var(--ink)] disabled:opacity-40", primary ? "border-[var(--enemy)] bg-[var(--enemy)]/25" : "border-white/25 bg-black/55")}>
    <Icon className={cn("size-7 shrink-0", primary ? "text-[var(--bone)]" : "text-[var(--gold)]")} />
    <span><span className="hud-sc block text-[17px] leading-5">{label}</span><span className="block text-xs leading-4 text-[#9a8e7b]">{sub}</span></span>
  </button>
);

export function ActionGrid({ turn, pending, labels, available, actions }: {
  turn: Turn;
  pending: boolean;
  labels: { attack: string; magic: string; bonus: string };
  available: { magic: boolean; bonus: boolean };
  actions: { attack(): void; magic(): void; bonus(): void };
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 pt-3">
        <Tile icon={Swords} label="Атака" sub={turn.actionUsed ? "використано" : labels.attack} used={turn.actionUsed || turn.skipped || pending} primary onClick={actions.attack} />
        <Tile icon={BookOpen} label="Магія" sub={turn.actionUsed ? "дію використано" : labels.magic} used={turn.actionUsed || turn.skipped || !available.magic || pending} onClick={actions.magic} />
        <Tile icon={Sparkles} label="Бонус" sub={labels.bonus} used={!turn.bonusAvailable || turn.skipped || !available.bonus || pending} onClick={actions.bonus} />
        <Tile icon={Hourglass} label="Мораль" sub="перевірено" used />
      </div>
      {turn.phase !== "countdown" && (
        <button type="button" disabled={pending} onClick={() => void turn.endTurn()} className="hud-sc mt-2 flex h-11 w-full items-center justify-center border border-white/15 text-[15px] tracking-[.08em] text-[#b8ab95] disabled:opacity-50">
          Завершити хід
        </button>
      )}
    </>
  );
}
