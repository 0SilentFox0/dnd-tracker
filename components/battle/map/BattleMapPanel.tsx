"use client";

import { BattleMap } from "./BattleMap";
import { MapTerrainToolbar } from "./MapTerrainToolbar";

import { useBattleMapScene } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-7 rounded-md border bg-black/60 px-2 text-xs hover:bg-black/80",
        active ? "border-[var(--gold)] text-hud-gold-bright" : "border-hud-rule text-hud-muted",
      )}
    >
      {children}
    </button>
  );
}

export function BattleMapPanel() {
  const scene = useBattleMapScene();

  if (!scene) return null;

  const { placement, terrainTool } = scene;

  return (
    <div className="relative h-full">
      <BattleMap map={scene.map} participants={scene.participants} view={scene.view} actions={scene.actions} strokeTool={terrainTool?.active} className="h-full" />
      {placement && terrainTool && (
        <div className="absolute left-2 top-2 z-20 flex flex-col items-start gap-1.5">
          <div className="flex gap-1.5">
            <ModeButton active={placement.active} onClick={placement.toggle}>
              Розставити
            </ModeButton>
            <ModeButton active={terrainTool.active} onClick={terrainTool.toggle}>
              Місцевість
            </ModeButton>
          </div>
          {terrainTool.active && <MapTerrainToolbar tool={terrainTool} />}
        </div>
      )}
    </div>
  );
}
