"use client";

import { createPortal } from "react-dom";

import { BattleMap } from "./BattleMap";
import { MapTerrainToolbar } from "./MapTerrainToolbar";
import { useMapToolsSlot } from "./MapToolsSlot";
import { MapWeatherPicker } from "./MapWeatherPicker";
import { MazeEditPalette, MazeToolbar } from "./maze";

import { useBattleMapScene } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

function ModeButton({ active, onClick, tall, hidden, children }: { active: boolean; onClick: () => void; tall: boolean; hidden?: boolean; children: string }) {
  return (
    <button
      type="button"
      hidden={hidden}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        tall ? "h-8" : "h-7",
        "rounded-md border bg-black/60 px-2 text-xs hover:bg-black/80",
        active ? "border-[var(--gold)] text-hud-gold-bright" : "border-hud-rule text-hud-muted",
      )}
    >
      {children}
    </button>
  );
}

export function BattleMapPanel({ phone = false }: { phone?: boolean }) {
  const scene = useBattleMapScene();

  const slot = useMapToolsSlot();

  if (!scene) return null;

  const { placement, terrainTool, weatherTool } = scene;

  const mazeTools = phone ? null : scene.mazeTools;

  const inRow = !phone && !!slot;

  const tools = placement && terrainTool && weatherTool && (
    // на телефоні карта займає всю ширину, тож кнопки йдуть рядком над нею, а не поверх клітинок
    <div className={cn("z-20 flex flex-col items-start gap-1.5", phone ? "shrink-0 px-1 pb-1" : !inRow && "absolute left-2 top-2")}>
      <div className="flex flex-wrap gap-1.5">
        <ModeButton active={placement.active} onClick={placement.toggle} tall={inRow}>
          Розставити
        </ModeButton>
        {mazeTools && <MazeToolbar tools={mazeTools} tall={inRow} />}
        <ModeButton active={terrainTool.active} onClick={terrainTool.toggle} tall={inRow} hidden={!!scene.map.maze}>
          Місцевість
        </ModeButton>
        <ModeButton active={weatherTool.active} onClick={weatherTool.toggle} tall={inRow}>
          Погода
        </ModeButton>
      </div>
      {(terrainTool.active || weatherTool.active) && (
        // у рядку над картою палітра звисає вниз на карту, не зсуваючи й не перекриваючи перемикач вигляду
        <div className={cn("flex flex-col items-start gap-1.5", inRow && "absolute inset-x-3 top-full z-30 mt-1")}>
          {terrainTool.active && <MapTerrainToolbar tool={terrainTool} />}
          {weatherTool.active && <MapWeatherPicker tool={weatherTool} />}
        </div>
      )}
      {mazeTools && mazeTools.state.tool !== "none" && (
        <div className={cn(inRow && "absolute inset-x-3 top-full z-30 mt-1")}>
          <MazeEditPalette tools={mazeTools} />
        </div>
      )}
    </div>
  );

  return (
    <div className={cn("relative h-full", phone && "flex flex-col")}>
      {phone && tools}
      <BattleMap map={scene.map} participants={scene.participants} view={scene.view} actions={scene.actions} editing={{ strokeTool: terrainTool?.active, maze: mazeTools?.editing }} phone={phone} className={phone ? "min-h-0 flex-1" : "h-full"} />
      {!phone && (inRow ? tools && createPortal(tools, slot) : tools)}
    </div>
  );
}
