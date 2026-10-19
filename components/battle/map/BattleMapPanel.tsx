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

export function BattleMapPanel({ phone = false }: { phone?: boolean }) {
  const scene = useBattleMapScene();

  if (!scene) return null;

  const { placement, terrainTool } = scene;

  const tools = placement && terrainTool && (
    // на телефоні карта займає всю ширину, тож кнопки йдуть рядком над нею, а не поверх клітинок
    <div className={cn("z-20 flex flex-col items-start gap-1.5", phone ? "shrink-0 px-1 pb-1" : "absolute left-2 top-2")}>
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
  );

  return (
    <div className={cn("relative h-full", phone && "flex flex-col")}>
      {phone && tools}
      <BattleMap map={scene.map} participants={scene.participants} view={scene.view} actions={scene.actions} editing={{ strokeTool: terrainTool?.active }} phone={phone} className={phone ? "min-h-0 flex-1" : "h-full"} />
      {!phone && tools}
    </div>
  );
}
