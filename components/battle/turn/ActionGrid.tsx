"use client";

import { BookOpen, Hourglass, Sparkles, Swords, Undo2, Zap } from "lucide-react";

import type { usePlayerTurn } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import type { MoraleOutcome } from "@/lib/utils/battle/flows";

type Turn = ReturnType<typeof usePlayerTurn>;

const MORALE_LABEL: Record<MoraleOutcome, string> = { none: "Мораль: без змін", extra: "Бойовий дух", skip: "Паніка" };

const Tile = ({ icon: Icon, label, used, primary, onClick }: { icon: typeof Swords; label: string; used?: boolean; primary?: boolean; onClick?: () => void }) => (
  <button type="button" disabled={used} onClick={onClick} className={cn("flex h-16 min-w-0 items-center gap-3 border px-3.5 text-left text-[var(--ink)] disabled:opacity-40", primary ? "border-[var(--enemy)] bg-[var(--enemy)]/25" : "border-white/25 bg-black/55")}>
    <Icon className={cn("size-7 shrink-0", primary ? "text-[var(--bone)]" : "text-[var(--gold)]")} />
    <span className="hud-sc text-[17px] leading-5">{label}</span>
  </button>
);

export function ActionGrid({ turn, pending, available, actions }: {
  turn: Turn;
  pending: boolean;
  available: { magic: boolean; bonus: boolean; ability?: boolean };
  actions: { attack(): void; magic(): void; bonus(): void; ability?(): void };
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 pt-3">
        <Tile icon={Swords} label="Атака" used={turn.status.actionUsed || turn.status.skipped || pending} primary onClick={actions.attack} />
        <Tile icon={BookOpen} label="Магія" used={(turn.status.actionUsed && !turn.status.bonusSpellReady) || turn.status.skipped || !available.magic || pending} onClick={actions.magic} />
        {available.ability && <Tile icon={Zap} label="Вміння" used={turn.status.actionUsed || turn.status.skipped || pending} onClick={actions.ability} />}
        <Tile icon={Sparkles} label="Бонус" used={!turn.status.bonusAvailable || turn.status.skipped || !available.bonus || pending} onClick={actions.bonus} />
        {turn.strikeAndReturn.available && <Tile icon={Undo2} label="Повернутися" used={pending} onClick={turn.strikeAndReturn.run} />}
        {turn.moraleResult && <Tile icon={Hourglass} label={MORALE_LABEL[turn.moraleResult]} used />}
      </div>
      {turn.phase !== "countdown" && (
        <button type="button" disabled={pending} onClick={() => void turn.actions.endTurn()} className="hud-sc mt-2 flex h-11 w-full items-center justify-center border border-white/15 text-[15px] tracking-[.08em] text-[#b8ab95] disabled:opacity-50">
          Завершити хід
        </button>
      )}
    </>
  );
}
