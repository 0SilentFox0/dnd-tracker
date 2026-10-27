import type { DragEvent, ReactNode } from "react";

import { EntityIcon } from "@/components/common/EntityIcon";
import { ARTIFACT_RARITY_COLOR, artifactRarityLabel } from "@/lib/constants/artifacts";
import { cn } from "@/lib/utils";

interface InventoryCellProps {
  label: string;
  thing?: { name: string; icon: string | null; rarity: string | null; badge?: string };
  placeholder?: ReactNode;
  state: { selected: boolean; drop: "accept" | "dim" | null };
  dnd?: {
    draggable?: boolean;
    onDragStart?: (e: DragEvent) => void;
    onDragEnd?: () => void;
    onDragOver?: (e: DragEvent) => void;
    onDrop?: (e: DragEvent) => void;
  };
  onClick?: () => void;
}

export function InventoryCell({ label, thing, placeholder, state, dnd, onClick }: InventoryCellProps) {
  const inert = !thing && !onClick;

  const title = thing ? (thing.rarity ? `${thing.name} · ${artifactRarityLabel(thing.rarity)}` : thing.name) : undefined;

  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      aria-disabled={inert || undefined}
      tabIndex={inert ? -1 : undefined}
      data-drop={state.drop ?? undefined}
      draggable={dnd?.draggable}
      onDragStart={dnd?.onDragStart}
      onDragEnd={dnd?.onDragEnd}
      onDragOver={dnd?.onDragOver}
      onDrop={dnd?.onDrop}
      onClick={onClick}
      className={cn(
        "relative flex aspect-square min-h-11 items-center justify-center overflow-hidden rounded-md text-hud-muted transition",
        thing
          ? cn("border-2 bg-hud-field shadow-[inset_0_2px_6px_rgba(0,0,0,0.7),inset_0_0_0_1px_rgba(255,255,255,0.04)]", ARTIFACT_RARITY_COLOR[thing.rarity ?? ""] ?? "border-hud-line")
          : "border border-dashed border-hud-rule bg-black/30 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]",
        state.selected && "ring-2 ring-hud-gold-strong",
        state.drop === "accept" && "border-hud-gold-strong bg-hud-gold-strong/15",
        state.drop === "dim" && "opacity-40",
        dnd?.draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      {thing ? (
        <>
          <EntityIcon src={thing.icon} name={thing.name} size={68} className="hud-sc pointer-events-none size-full rounded-none bg-transparent text-inherit" />
          {thing.badge && <span className="absolute right-0.5 bottom-0.5 rounded bg-black/75 px-1 text-[10px] leading-4 text-hud-ink">{thing.badge}</span>}
        </>
      ) : (
        <span className="flex size-3/5 items-center justify-center opacity-25 [&>svg]:size-full">{placeholder}</span>
      )}
    </button>
  );
}
