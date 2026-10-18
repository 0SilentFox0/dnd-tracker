"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import { playFx } from "@/components/battle/fx/runtime/play";
import { cn } from "@/lib/utils";
import { type FxArchetype, type FxElement, type FxSpec, IMPACT_MS } from "@/lib/utils/battle/fx";

interface LabUnit {
  id: string;
  name: string;
  side: "ally" | "enemy";
}

const UNITS: LabUnit[] = [
  { id: "a1", name: "Воїн", side: "ally" },
  { id: "a2", name: "Чарівниця", side: "ally" },
  { id: "e1", name: "Огр", side: "enemy" },
  { id: "e2", name: "Лич", side: "enemy" },
];

interface Props {
  archetype: FxArchetype;
  element: FxElement;
  critical: boolean;
  hit: boolean;
  playToken: number;
}

function targetsFor(archetype: FxArchetype) {
  if (archetype === "heal" || archetype === "buff") return ["a1"];

  return archetype === "area" || archetype === "meteor" || archetype === "entangle" ? ["e1", "e2"] : ["e1"];
}

export function FxLabPanel({ archetype, element, critical, hit, playToken }: Props) {
  const arenaRef = useRef<HTMLDivElement>(null);

  const layerRef = useRef<HTMLDivElement>(null);

  const busy = useRef(false);

  const [hitId, setHitId] = useState<{ ids: string[]; key: number }>({ ids: [], key: 0 });

  const [status, setStatus] = useState("");

  const run = async () => {
    const arena = arenaRef.current;

    const layer = layerRef.current;

    if (!arena || !layer || busy.current) return;

    busy.current = true;
    setStatus("");

    try {
      const actorId = archetype === "melee" ? "a1" : "a2";

      const targetIds = targetsFor(archetype);

      const spec: FxSpec = { key: `lab-${Date.now()}`, archetype, element, actorId, actorSide: "ally", targetIds, hit, critical };

      const started = performance.now();

      const timer = setTimeout(() => setHitId({ ids: hit ? targetIds : [], key: performance.now() }), IMPACT_MS[archetype]);

      await playFx(layer, spec, arena);
      clearTimeout(timer);
      setStatus(`завершено за ${Math.round(performance.now() - started)} мс (удар: ${IMPACT_MS[archetype]} мс)`);
    } catch (e) {
      setStatus(`Помилка: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      busy.current = false;
    }
  };

  const onToken = useEffectEvent(() => void run());

  useEffect(() => {
    if (playToken) onToken();
  }, [playToken]);

  const column = (side: LabUnit["side"]) => (
    <div className="space-y-2">
      {UNITS.filter((u) => u.side === side).map((u) => (
        <div
          key={`${u.id}-${hitId.ids.includes(u.id) ? hitId.key : 0}`}
          data-fx-participant={u.id}
          className={cn("flex min-h-[64px] items-center gap-2.5 rounded-lg border border-white/[.08] bg-black/30 px-3 py-2 text-sm font-bold text-[var(--ink)]", hitId.ids.includes(u.id) && "animate-[hud-flash-red_.5s]")}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-[#241d16] text-xs text-[var(--bone)]" style={{ boxShadow: `0 0 0 2px ${side === "ally" ? "var(--ally)" : "var(--enemy)"}, 0 0 0 3px #000` }}>
            {u.name.slice(0, 2)}
          </span>
          {u.name}
        </div>
      ))}
    </div>
  );

  return (
    <section className="rounded-xl border border-hud-rule bg-[rgba(17,14,11,.82)] p-3">
      <div ref={arenaRef} className="relative grid grid-cols-2 gap-x-16 gap-y-2 py-6">
        {column("ally")}
        {column("enemy")}
        <div ref={layerRef} className="fx-layer" />
      </div>
      <p data-testid="fx-status" className="mt-1.5 h-4 text-[11px] text-hud-muted">{status}</p>
    </section>
  );
}
