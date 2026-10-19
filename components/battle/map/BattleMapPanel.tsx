"use client";

import { createPortal } from "react-dom";

import { BattleMap } from "./BattleMap";
import { MapTerrainToolbar } from "./MapTerrainToolbar";
import { useMapToolsSlot } from "./MapToolsSlot";

import { useBattleMapScene } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

function ModeButton({ active, onClick, tall, children }: { active: boolean; onClick: () => void; tall: boolean; children: string }) {
  return (
    <button
      type="button"
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

  const { placement, terrainTool } = scene;

  const inRow = !phone && !!slot;

  const tools = placement && terrainTool && (
    // на телефоні карта займає всю ширину, тож кнопки йдуть рядком над нею, а не поверх клітинок
    <div className={cn("z-20 flex flex-col items-start gap-1.5", phone ? "shrink-0 px-1 pb-1" : !inRow && "absolute left-2 top-2")}>
      <div className="flex gap-1.5">
        <ModeButton active={placement.active} onClick={placement.toggle} tall={inRow}>
          Розставити
        </ModeButton>
        <ModeButton active={terrainTool.active} onClick={terrainTool.toggle} tall={inRow}>
          Місцевість
        </ModeButton>
      </div>
      {terrainTool.active && (
        // у рядку над картою палітра звисає вниз на карту, не зсуваючи й не перекриваючи перемикач вигляду
        <div className={cn(inRow && "absolute inset-x-3 top-full z-30 mt-1")}>
          <MapTerrainToolbar tool={terrainTool} />
        </div>
      )}
    </div>
  );

  return (
    <div className={cn("relative h-full", phone && "flex flex-col")}>
      {phone && tools}
      <BattleMap map={scene.map} participants={scene.participants} view={scene.view} actions={scene.actions} editing={{ strokeTool: terrainTool?.active }} phone={phone} className={phone ? "min-h-0 flex-1" : "h-full"} />
      {!phone && (inRow ? tools && createPortal(tools, slot) : tools)}
    </div>
  );
}
