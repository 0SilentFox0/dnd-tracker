"use client";

import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Skull, Star, X } from "lucide-react";

import { useBattleScene, useMazeView } from "@/lib/hooks/battle";
import { mazeBudgetLeft } from "@/lib/utils/battle/maze";
import type { BattleParticipant, MazeMarkSymbol } from "@/types/battle";

const SYMBOLS: { symbol: MazeMarkSymbol; label: string; Icon: typeof Star }[] = [
  { symbol: "arrow-n", label: "Стрілка вгору", Icon: ArrowUp },
  { symbol: "arrow-e", label: "Стрілка праворуч", Icon: ArrowRight },
  { symbol: "arrow-s", label: "Стрілка вниз", Icon: ArrowDown },
  { symbol: "arrow-w", label: "Стрілка ліворуч", Icon: ArrowLeft },
  { symbol: "cross", label: "Хрест", Icon: X },
  { symbol: "skull", label: "Череп", Icon: Skull },
  { symbol: "star", label: "Зірка", Icon: Star },
];

export function MazeMarkPicker({ hero }: { hero: BattleParticipant }) {
  const { battle, actions, anyPending } = useBattleScene();

  const { view } = useMazeView();

  const [open, setOpen] = useState(false);

  if (!battle.map?.maze || !view || battle.map.maze.dark || mazeBudgetLeft(hero) <= 0) return null;

  const place = (symbol: MazeMarkSymbol) => {
    actions.mazeMark.mutate({ participantId: hero.basicInfo.id, symbol });
    setOpen(false);
  };

  return (
    <div className="pt-2">
      <button
        type="button"
        disabled={anyPending}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="hud-sc flex h-11 w-full items-center justify-center border border-white/25 bg-black/55 text-[15px] tracking-[.08em] text-[var(--ink)] disabled:opacity-50"
      >
        Мітка
      </button>
      {open && (
        <div role="group" aria-label="Символ мітки" className="mt-1 grid grid-cols-7 gap-1">
          {SYMBOLS.map(({ symbol, label, Icon }) => (
            <button key={symbol} type="button" aria-label={label} disabled={anyPending} onClick={() => place(symbol)} className="flex h-11 items-center justify-center border border-white/25 bg-black/55 text-[var(--gold)] disabled:opacity-50">
              <Icon className="size-5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
