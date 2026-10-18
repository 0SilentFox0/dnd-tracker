"use client";

import { type Ref, useEffect, useImperativeHandle, useRef, useState } from "react";

import type { SpellArenaHandle } from "./types";

import { ARCHETYPE_LABEL, ELEMENT_LABEL } from "@/components/battle/fx/labels";
import { PreviewUnitRow } from "@/components/battle/fx/preview/PreviewUnitRow";
import { playFx } from "@/components/battle/fx/runtime/play";
import { cancelLayer } from "@/components/battle/fx/runtime/stage";
import { IMPACT_MS } from "@/lib/utils/battle/fx";
import { PREVIEW_UNITS, type PreviewUnit } from "@/lib/utils/battle/fx/preview-units";
import type { SpellFxPreview } from "@/lib/utils/battle/fx/spell-preview";

const AURA_MS = 4000;

interface Shown {
  token: number;
  spell: SpellFxPreview;
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
        <PreviewUnitRow
          key={u.id}
          unit={u}
          target={shown?.spell.targets.find((t) => t.id === u.id)}
          hit={shown?.spell.spec ? { token: shown.token, delayMs: IMPACT_MS[shown.spell.spec.archetype] } : null}
          aurasOn={aurasOn}
        />
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
