"use client";

import { useState } from "react";
import Image from "next/image";

import { EntityIcon } from "@/components/common/EntityIcon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ARTIFACT_GRID_9, ArtifactSlot } from "@/lib/constants/artifacts";
import { useEquipArtifact } from "@/lib/hooks/characters";
import { useNotify } from "@/lib/hooks/common";
import { buildEquipped } from "@/lib/utils/artifacts/equipment";
import type { EquippedItems } from "@/types/inventory";

export interface ArtifactOption {
  id: string;
  name: string;
  slot: string;
  icon?: string | null;
}

interface CharacterArtifactsSectionProps {
  campaignId: string;
  characterId: string;
  equipped: EquippedItems;
  artifacts: ArtifactOption[];
  onEquippedChange: (equipped: EquippedItems) => void;
}

const CELL =
  "relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded border-2 border-amber-700/80 bg-stone-900/60 p-1 text-center shadow-inner transition-colors hover:border-amber-600/90 hover:bg-stone-800/80 disabled:opacity-50";

export function CharacterArtifactsSection({ campaignId, characterId, equipped, artifacts, onEquippedChange }: CharacterArtifactsSectionProps) {
  const notify = useNotify();

  const equip = useEquipArtifact(campaignId, characterId);

  const [updatingSlot, setUpdatingSlot] = useState<string | null>(null);

  const handleSlotChange = (slotKey: string, artifactId: string | null) => {
    const next = buildEquipped(equipped, slotKey, artifactId);

    setUpdatingSlot(slotKey);
    equip.mutate(next, {
      onSuccess: () => onEquippedChange(next),
      onError: () => void notify("Не вдалося змінити спорядження"),
      onSettled: () => setUpdatingSlot(null),
    });
  };

  return (
    <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-lg border border-amber-900/50 bg-[#2a2520] shadow-xl">
      <div className="absolute inset-0">
        <Image src="/screen-bg/artefacts-bg.jpg" alt="" fill className="object-cover opacity-40 sepia" sizes="(max-width: 448px) 100vw, 448px" />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/30 to-stone-950/50" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="grid h-full max-h-[280px] w-full max-w-[280px] grid-cols-3 grid-rows-3 gap-2">
          {ARTIFACT_GRID_9.map((cell) => {
            const equippedId = equipped[cell.key] as string | undefined;

            const current = equippedId ? artifacts.find((a) => a.id === equippedId) : undefined;

            const available = artifacts.filter((a) => a.slot === cell.slotType || (cell.slotType === ArtifactSlot.WEAPON && a.slot === ArtifactSlot.RANGE_WEAPON));

            return (
              <DropdownMenu key={cell.key}>
                <DropdownMenuTrigger asChild>
                  <button type="button" disabled={updatingSlot === cell.key} className={CELL} title={current ? `${cell.label}: ${current.name}` : cell.label}>
                    {current ? (
                      <>
                        <EntityIcon src={current.icon} name={current.name} size={80} className="absolute inset-0 size-full rounded bg-muted/80 text-lg font-medium text-amber-200" />
                        <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[9px] uppercase text-amber-200/90">{cell.label}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] uppercase leading-tight text-amber-200/80">{cell.label}</span>
                        <span className="mt-0.5 w-full truncate text-xs font-medium text-amber-100">—</span>
                      </>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="min-w-[180px]">
                  <DropdownMenuItem onClick={() => handleSlotChange(cell.key, null)}>Не обрано</DropdownMenuItem>
                  {available.length === 0 ? (
                    <DropdownMenuItem disabled>Немає артефактів для цього слоту</DropdownMenuItem>
                  ) : (
                    available.map((a) => (
                      <DropdownMenuItem key={a.id} onClick={() => handleSlotChange(cell.key, a.id)} className="flex items-center gap-2">
                        <EntityIcon src={a.icon} name={a.name} size={20} className="size-5 rounded text-[10px] font-medium" />
                        <span className="truncate">{a.name}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </div>
      </div>
    </div>
  );
}
