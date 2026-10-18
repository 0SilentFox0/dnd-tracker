"use client";

import { type Ref, useEffect, useImperativeHandle, useRef, useState } from "react";

import { ARCHETYPE_LABEL, ELEMENT_LABEL } from "../labels";
import type { SpellArenaHandle } from "./types";

import { AuraCanvas } from "@/components/battle/fx/auras/canvas/AuraCanvas";
import { FRAMES } from "@/components/battle/fx/frames/canvas";
import { CanvasFrame } from "@/components/battle/fx/frames/canvas/CanvasFrame";
import { playFx } from "@/components/battle/fx/runtime/play";
import { cancelLayer } from "@/components/battle/fx/runtime/stage";
import { cn } from "@/lib/utils";
import { IMPACT_MS } from "@/lib/utils/battle/fx";
import { PREVIEW_UNITS, type PreviewUnit, type SpellFxPreview, type SpellFxTarget } from "@/lib/utils/battle/fx/spell-preview";

const AURA_MS = 4000;

const PORTRAIT = 40;

const HP: Record<PreviewUnit["id"], number> = { caster: 1, ally: 0.2, fallen: 0, e1: 1, e2: 1 };

interface Shown {
  token: number;
  spell: SpellFxPreview;
}

function UnitRow({ unit, target, shown, aurasOn }: { unit: PreviewUnit; target: SpellFxTarget | undefined; shown: Shown | null; aurasOn: boolean }) {
  const frame = target?.frame && shown?.spell.spec ? <CanvasFrame key={shown.token} frame={FRAMES[target.frame]} delayMs={IMPACT_MS[shown.spell.spec.archetype]} /> : null;

  const fallen = unit.id === "fallen";

  return (
    <div data-fx-participant={unit.id} className="relative flex min-h-[60px] items-center gap-2.5 rounded-lg border border-white/[.08] bg-black/30 px-3 py-2 text-sm font-bold text-[var(--ink)]">
      {frame}
      <span className="relative shrink-0">
        <span
          className={cn("flex items-center justify-center rounded-full bg-[#241d16] text-xs text-[var(--bone)]", fallen && "opacity-50 grayscale")}
          style={{ width: PORTRAIT, height: PORTRAIT, boxShadow: `0 0 0 2px ${unit.side === "ally" ? "var(--ally)" : "var(--enemy)"}, 0 0 0 3px #000` }}
        >
          {fallen ? "†" : unit.name.slice(0, 2)}
        </span>
        {aurasOn && target?.auras.length ? <AuraCanvas kinds={target.auras} size={PORTRAIT} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate", fallen && "text-hud-muted")}>{unit.name}</span>
        <span className="mt-1 block h-1 rounded-full bg-white/10">
          <span className="block h-full rounded-full bg-[#c0392b]" style={{ width: `${HP[unit.id] * 100}%` }} />
        </span>
      </span>
    </div>
  );
}

// the app header is fixed, so "visible" starts below it
function revealBelowHeader(el: HTMLElement) {
  const header = parseFloat(getComputedStyle(document.body).getPropertyValue("--app-header-h")) || 0;

  const r = el.getBoundingClientRect();

  if (r.top < header || r.bottom > window.innerHeight) window.scrollTo({ top: window.scrollY + r.top - header - 8, behavior: "instant" });
}

export function SpellArena({ ref }: { ref?: Ref<SpellArenaHandle> }) {
  const arenaRef = useRef<HTMLDivElement>(null);

  const layerRef = useRef<HTMLDivElement>(null);

  const runId = useRef(0);

  const auraTimer = useRef<number | undefined>(undefined);

  const [shown, setShown] = useState<Shown | null>(null);

  const [aurasOn, setAurasOn] = useState(false);

  const [status, setStatus] = useState("Натисніть ▶ на картці закляття.");

  const play = async (spell: SpellFxPreview) => {
    const arena = arenaRef.current;

    const layer = layerRef.current;

    if (!arena || !layer) return;

    const id = ++runId.current;

    window.clearTimeout(auraTimer.current);
    cancelLayer(layer);
    setAurasOn(false);
    setShown({ token: id, spell });

    if (!spell.spec) {
      setStatus(`${spell.name}: анімації немає${spell.error ? ` (${spell.error})` : ""}`);

      return;
    }

    // a sticky arena is always visible on desktop; on phones the arena may be scrolled away
    revealBelowHeader(arena);

    setStatus(`${spell.name}: ${ARCHETYPE_LABEL[spell.spec.archetype]} · ${ELEMENT_LABEL[spell.spec.element]}`);

    try {
      await playFx(layer, { ...spell.spec, key: `spells-${id}` }, arena);
    } catch (e) {
      setStatus(`Помилка: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (runId.current !== id) return;

    setAurasOn(true);
    auraTimer.current = window.setTimeout(() => {
      if (runId.current === id) setAurasOn(false);
    }, AURA_MS);
  };

  useImperativeHandle(ref, () => ({ play: (spell) => void play(spell) }));

  useEffect(() => {
    const layer = layerRef.current;

    return () => {
      window.clearTimeout(auraTimer.current);

      if (layer) cancelLayer(layer);
    };
  }, []);

  const column = (side: PreviewUnit["side"]) => (
    <div className="space-y-2">
      {PREVIEW_UNITS.filter((u) => u.side === side).map((u) => (
        <UnitRow key={u.id} unit={u} target={shown?.spell.targets.find((t) => t.id === u.id)} shown={shown} aurasOn={aurasOn} />
      ))}
    </div>
  );

  return (
    <section aria-label="Арена" className="rounded-xl border border-hud-rule bg-[rgba(17,14,11,.92)] p-3">
      <div ref={arenaRef} className="relative grid grid-cols-2 gap-x-6 py-3 sm:gap-x-10">
        {column("ally")}
        {column("enemy")}
        <div ref={layerRef} className="fx-layer" />
      </div>
      <p data-testid="fx-spells-status" className="min-h-4 text-[11px] text-hud-muted">
        {status}
      </p>
    </section>
  );
}
