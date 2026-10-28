"use client";

import { useCallback, useRef, useState } from "react";
import { Dices, Minus, Plus } from "lucide-react";

import "@/components/battle/fx/fx.css";
import { DiceStage, type DiceStageHandle } from "@/components/battle/fx/dice/DiceStage";
import { ROLLER_MAX_COUNT, ROLLER_SIDES, useDiceRoller } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import type { DiceThrowSpec } from "@/lib/utils/battle/fx/dice";

const stepClass = "flex size-8 items-center justify-center rounded-full border border-hud-rule hover:bg-white/10 disabled:opacity-30";

/** Віртуальні кубики для перевірок, коли своїх під рукою немає; кидок бачить лише той, хто кидає. */
export function DiceRoller() {
  const [open, setOpen] = useState(false);

  const stage = useRef<DiceStageHandle>(null);

  const play = useCallback((spec: DiceThrowSpec) => stage.current?.play(spec) ?? Promise.resolve(), []);

  const { pick, result, isRolling, roll } = useDiceRoller(play);

  const { sides, count } = pick.data;

  return (
    <div className="relative" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Кинути кубики"
        className="flex size-9 items-center justify-center rounded-full border border-hud-rule bg-black/70 text-hud-bone hover:bg-black/90"
      >
        <Dices className="size-4" />
      </button>
      {open && (
        <div role="dialog" aria-label="Кидок кубиків" className="absolute right-0 top-11 w-64 space-y-3 rounded-lg border border-hud-rule bg-black/85 p-3 text-hud-bone shadow-2xl backdrop-blur">
          <div className="grid grid-cols-3 gap-1.5">
            {ROLLER_SIDES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={s === sides}
                onClick={() => pick.set({ sides: s })}
                className={cn("h-9 rounded border border-hud-rule text-sm font-semibold hover:bg-white/10", s === sides && "border-hud-gold-strong bg-hud-gold-strong/20 text-hud-gold-bright")}
              >
                d{s}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-hud-muted">Кількість</span>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Менше кубиків" disabled={count <= 1} onClick={() => pick.set({ count: count - 1 })} className={stepClass}>
                <Minus className="size-3.5" />
              </button>
              <span className="w-5 text-center font-semibold tabular-nums">{count}</span>
              <button type="button" aria-label="Більше кубиків" disabled={count >= ROLLER_MAX_COUNT} onClick={() => pick.set({ count: count + 1 })} className={stepClass}>
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>
          <button
            type="button"
            disabled={isRolling}
            onClick={() => void roll()}
            className="h-10 w-full rounded border-2 border-hud-gold-strong bg-hud-gold-strong/20 font-semibold text-hud-gold-bright hover:bg-hud-gold-strong/30 disabled:opacity-50"
          >
            Кинути {count}d{sides}
          </button>
          <div aria-live="polite" className="min-h-12 text-center">
            {result && (
              <>
                <div className="text-3xl font-bold tabular-nums text-hud-gold-bright">{result.total}</div>
                {result.values.length > 1 && (
                  <div className="text-xs text-hud-muted">
                    {result.values.length}d{result.sides}: {result.values.join(" + ")}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      <DiceStage ref={stage} />
    </div>
  );
}
