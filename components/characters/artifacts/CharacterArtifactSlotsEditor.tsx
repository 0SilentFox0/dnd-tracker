"use client";

import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateInventory } from "@/lib/api/inventory";
import {
  ARTIFACT_GRID_9,
  ArtifactSlot,
} from "@/lib/constants/artifacts";
import type { EquippedItems } from "@/types/inventory";

export interface ArtifactOption {
  id: string;
  name: string;
  slot: string;
}

interface CharacterArtifactSlotsEditorProps {
  campaignId: string;
  characterId: string;
  equipped: EquippedItems;
  artifacts: ArtifactOption[];
  onEquippedChange: (equipped: EquippedItems) => void;
}

export function CharacterArtifactSlotsEditor({
  campaignId,
  characterId,
  equipped,
  artifacts,
  onEquippedChange,
}: CharacterArtifactSlotsEditorProps) {
  const [updatingSlot, setUpdatingSlot] = useState<string | null>(null);

  const handleSlotChange = async (
    slotKey: string,
    artifactId: string | null,
  ) => {
    const newEquipped: EquippedItems = {};

    for (const cell of ARTIFACT_GRID_9) {
      const id =
        cell.key === slotKey
          ? (artifactId ?? undefined)
          : (equipped[cell.key] as string | undefined);

      if (id) newEquipped[cell.key] = id;
    }

    setUpdatingSlot(slotKey);
    try {
      await updateInventory(campaignId, characterId, { equipped: newEquipped });
      onEquippedChange(newEquipped);
    } catch (err) {
      console.error("Failed to update equipped artifact:", err);
    } finally {
      setUpdatingSlot(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Натисніть на слот, щоб обрати артефакт для нього
      </p>
      <div className="grid grid-cols-3 gap-2 max-w-sm">
        {ARTIFACT_GRID_9.map((cell) => {
          const equippedId = equipped[cell.key] as string | undefined;

          const equippedArtifact = equippedId
            ? artifacts.find((a) => a.id === equippedId)
            : null;

          const available = artifacts.filter(
            (a) =>
              a.slot === cell.slotType ||
              (cell.slotType === ArtifactSlot.WEAPON &&
                a.slot === ArtifactSlot.RANGE_WEAPON),
          );

          const isUpdating = updatingSlot === cell.key;

          return (
            <DropdownMenu key={cell.key}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={isUpdating}
                  className="flex flex-col items-center justify-center min-h-[72px] rounded-lg border border-input bg-muted/40 hover:bg-muted transition-colors disabled:opacity-50 text-left"
                >
                  <span className="text-[10px] uppercase text-muted-foreground mt-1">
                    {cell.label}
                  </span>
                  <span className="text-sm font-medium px-2 py-1 truncate max-w-full">
                    {equippedArtifact?.name ?? "—"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[180px]">
                <DropdownMenuItem
                  onClick={() => handleSlotChange(cell.key, null)}
                >
                  Не обрано
                </DropdownMenuItem>
                {available.length === 0 ? (
                  <DropdownMenuItem disabled>
                    Немає артефактів для цього слоту
                  </DropdownMenuItem>
                ) : (
                  available.map((a) => (
                    <DropdownMenuItem
                      key={a.id}
                      onClick={() => handleSlotChange(cell.key, a.id)}
                    >
                      {a.name}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
      </div>
    </div>
  );
}
