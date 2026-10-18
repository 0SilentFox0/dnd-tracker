"use client";

import { BattleMap } from "./BattleMap";

import { useBattleMapScene } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

export function BattleMapPanel() {
  const scene = useBattleMapScene();

  if (!scene) return null;

  const { placement } = scene;

  return (
    <div className="relative h-full">
      <BattleMap map={scene.map} participants={scene.participants} view={scene.view} actions={scene.actions} className="h-full" />
      {placement && (
        <button
          type="button"
          aria-pressed={placement.active}
          onClick={placement.toggle}
          className={cn(
            "absolute left-2 top-2 z-20 h-7 rounded-md border bg-black/60 px-2 text-xs hover:bg-black/80",
            placement.active ? "border-[var(--gold)] text-hud-gold-bright" : "border-hud-rule text-hud-muted",
          )}
        >
          Розставити
        </button>
      )}
    </div>
  );
}
