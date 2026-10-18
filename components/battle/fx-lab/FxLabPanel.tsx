"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Play, Skull } from "lucide-react";

import { LAB_UNITS, type LabEngineInfo, type LabScenario, type LabUnit } from "./config";
import type { FxPoint, FxReaction } from "./types";

import { cn } from "@/lib/utils";

interface Reaction {
  id: string;
  kind: FxReaction;
  amount: number;
  key: number;
}

const FLASH: Record<FxReaction, string> = {
  damage: "animate-[hud-flash-red_.5s]",
  heal: "animate-[hud-flash-green_.7s]",
  debuff: "fx-react-flash-purple",
};

function center(el: Element, layer: Element): FxPoint {
  const r = el.getBoundingClientRect();

  const l = layer.getBoundingClientRect();

  return { x: r.left - l.left + r.width / 2, y: r.top - l.top + r.height / 2 };
}

function LabCard({ unit, hp, cursed, reaction }: { unit: LabUnit; hp: number; cursed: boolean; reaction: Reaction | null }) {
  const mine = reaction?.id === unit.id ? reaction : null;

  const ring = unit.side === "ally" ? "var(--ally)" : "var(--enemy)";

  return (
    <div data-fx-card={unit.id} className="relative flex min-h-[64px] items-center gap-2.5 rounded-lg border border-white/[.08] bg-black/30 px-2 py-2">
      <div key={mine?.key} className={cn("flex min-w-0 flex-1 items-center gap-2.5", mine?.kind === "damage" && "animate-[hud-shake_.4s]")}>
        <span
          data-fx-portrait={unit.id}
          className={cn("flex size-10 shrink-0 items-center justify-center rounded-full bg-[#241d16] text-xs font-bold text-[var(--bone)]", mine && FLASH[mine.kind])}
          style={{ boxShadow: `0 0 0 2px ${ring}, 0 0 0 3px #000` }}
        >
          {unit.name.slice(0, 2)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="hud-sc flex items-center gap-1 text-sm font-bold text-[var(--ink)]">
            <span className="truncate">{unit.name}</span>
            {cursed && <Skull className="size-3.5 shrink-0 text-[#c27aff]" />}
            <span className="ml-auto font-sans text-xs font-medium text-[#d6cbb7]">{hp}/{unit.maxHp}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/60">
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(hp / unit.maxHp) * 100}%`, background: unit.side === "ally" ? "#6fae5a" : "#c0392b" }} />
          </div>
        </div>
      </div>
      {mine && (
        <span key={`n${mine.key}`} className={cn("hud-sc pointer-events-none absolute left-3 -top-1 z-30 text-xl font-extrabold opacity-0 [text-shadow:0_2px_6px_#000] animate-[hud-float_1.1s_ease-out]", mine.kind === "heal" ? "text-[#8fd07a]" : mine.kind === "debuff" ? "text-[#c27aff]" : "text-[#ff6a4d]")}>
          {mine.kind === "heal" ? `+${mine.amount}` : mine.kind === "debuff" ? `−${mine.amount} КБ` : `−${mine.amount}`}
        </span>
      )}
    </div>
  );
}

export function FxLabPanel({ engine, scenario, playToken }: { engine: LabEngineInfo; scenario: LabScenario; playToken: number }) {
  const arenaRef = useRef<HTMLDivElement>(null);

  const layerRef = useRef<HTMLDivElement>(null);

  const busy = useRef(false);

  const [hp, setHp] = useState<Record<string, number>>(() => Object.fromEntries(LAB_UNITS.map((u) => [u.id, u.hp])));

  const [cursed, setCursed] = useState<string[]>([]);

  const [reaction, setReaction] = useState<Reaction | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [ms, setMs] = useState<number | null>(null);

  const run = async () => {
    const arena = arenaRef.current;

    const layer = layerRef.current;

    if (!arena || !layer || busy.current) return;

    busy.current = true;
    setError(null);

    try {
      const fx = await engine.load();

      const q = (attr: string, id: string) => {
        const el = arena.querySelector<HTMLElement>(`[${attr}="${id}"]`);

        if (!el) throw new Error(`Немає елемента ${attr}=${id}`);

        return el;
      };

      const maxHp = LAB_UNITS.find((u) => u.id === scenario.to)?.maxHp ?? 1;

      const started = performance.now();

      await fx.play(scenario.id, {
        layer,
        from: center(q("data-fx-portrait", scenario.from), layer),
        to: center(q("data-fx-portrait", scenario.to), layer),
        fromEl: q("data-fx-card", scenario.from),
        toEl: q("data-fx-card", scenario.to),
        impact: () => {
          setReaction({ id: scenario.to, kind: scenario.reaction, amount: scenario.amount, key: performance.now() });

          if (scenario.reaction === "debuff") setCursed((list) => (list.includes(scenario.to) ? list : [...list, scenario.to]));
          else
            setHp((all) => {
              const next = all[scenario.to] + (scenario.reaction === "heal" ? scenario.amount : -scenario.amount);

              return { ...all, [scenario.to]: next <= 0 ? maxHp : Math.min(maxHp, next) };
            });
        },
      });
      setMs(Math.round(performance.now() - started));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      busy.current = false;
    }
  };

  const onToken = useEffectEvent(() => void run());

  useEffect(() => {
    if (playToken) onToken();
  }, [playToken]);

  const allies = LAB_UNITS.filter((u) => u.side === "ally");

  const enemies = LAB_UNITS.filter((u) => u.side === "enemy");

  return (
    <section className="rounded-xl border border-hud-rule bg-[rgba(17,14,11,.82)] p-3">
      <header className="mb-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="hud-sc flex items-baseline gap-2 text-base text-hud-ink">
            {engine.title}
            <span className="font-sans text-xs font-normal text-hud-muted">{engine.weight}</span>
          </h2>
          <p className="text-xs text-hud-muted">{engine.note}</p>
        </div>
        <button type="button" onClick={() => void run()} aria-label={`Програти: ${engine.title}`} className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#ffd9a8] shadow-[inset_0_0_0_1px_var(--color-hud-gold-strong)]">
          <Play className="size-4" />
        </button>
      </header>
      <div ref={arenaRef} className="relative grid grid-cols-2 gap-x-10 gap-y-2 sm:gap-x-16">
        <div className="space-y-2">{allies.map((u) => <LabCard key={u.id} unit={u} hp={hp[u.id]} cursed={cursed.includes(u.id)} reaction={reaction} />)}</div>
        <div className="space-y-2">{enemies.map((u) => <LabCard key={u.id} unit={u} hp={hp[u.id]} cursed={cursed.includes(u.id)} reaction={reaction} />)}</div>
        <div ref={layerRef} className="fx-layer" />
      </div>
      <p className="mt-1.5 h-4 text-[11px] text-hud-muted">{error ? <span className="text-[#e04a35]">{error}</span> : ms ? `тривалість: ${ms} мс` : ""}</p>
    </section>
  );
}
