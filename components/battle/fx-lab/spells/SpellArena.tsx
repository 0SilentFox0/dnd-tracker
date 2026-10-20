"use client";

import { type Ref, useEffect, useImperativeHandle, useMemo, useState } from "react";

import type { SpellArenaHandle } from "./types";

import { ARCHETYPE_LABEL, ELEMENT_LABEL } from "@/components/battle/fx/labels";
import { PreviewUnitRow } from "@/components/battle/fx/preview/PreviewUnitRow";
import { playFx } from "@/components/battle/fx/runtime/play";
import { cancelLayer } from "@/components/battle/fx/runtime/stage";
import { type FxRunner, useSpellFxPlayback } from "@/lib/hooks/battle";
import { PREVIEW_UNITS, type PreviewUnit, type SpellFxPreview } from "@/lib/utils/battle/fx";

const AURA_MS = 4000;

// the app header is fixed, so "visible" starts below it
function revealBelowHeader(el: HTMLElement) {
  const header = parseFloat(getComputedStyle(document.body).getPropertyValue("--app-header-h")) || 0;

  const r = el.getBoundingClientRect();

  if (r.top < header || r.bottom > window.innerHeight) window.scrollTo({ top: window.scrollY + r.top - header - 8, behavior: "instant" });
}

export function SpellArena({ ref }: { ref?: Ref<SpellArenaHandle> }) {
  const [spell, setSpell] = useState<SpellFxPreview | null>(null);

  const [status, setStatus] = useState("Натисніть ▶ на картці закляття.");

  const runner = useMemo<FxRunner>(
    () => ({
      play: (layer, spec, root) => playFx(layer, spec, root, Infinity).catch((e: unknown) => setStatus(`Помилка: ${e instanceof Error ? e.message : String(e)}`)),
      cancel: cancelLayer,
    }),
    [],
  );

  const spec = spell?.spec ?? null;

  const { arenaRef, layerRef, hit, settled, replay } = useSpellFxPlayback(spec, true, runner);

  const [auraExpired, setAuraExpired] = useState(false);

  const aurasOn = !!spec && settled && !auraExpired;

  useEffect(() => {
    if (!spec || !settled) return;

    const timer = window.setTimeout(() => setAuraExpired(true), AURA_MS);

    return () => window.clearTimeout(timer);
  }, [spec, settled]);

  const play = (next: SpellFxPreview) => {
    setSpell(next);
    setAuraExpired(false);
    replay();

    if (!next.spec) {
      setStatus(`${next.name}: анімації немає${next.error ? ` (${next.error})` : ""}`);

      return;
    }

    // a sticky arena is always visible on desktop; on phones the arena may be scrolled away
    if (arenaRef.current) revealBelowHeader(arenaRef.current);

    setStatus(`${next.name}: ${ARCHETYPE_LABEL[next.spec.archetype]} · ${ELEMENT_LABEL[next.spec.element]}`);
  };

  useImperativeHandle(ref, () => ({ play }));

  const column = (side: PreviewUnit["side"]) => (
    <div className="space-y-2">
      {PREVIEW_UNITS.filter((u) => u.side === side).map((u) => (
        <PreviewUnitRow key={u.id} unit={u} target={spell?.targets.find((t) => t.id === u.id)} hit={hit} aurasOn={aurasOn} />
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
