"use client";

import { useState } from "react";
import Image from "next/image";

import { CharacterSpellbook } from "./CharacterSpellbook";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateInventory } from "@/lib/api/inventory";
import { ARTIFACT_GRID_9, ArtifactSlot } from "@/lib/constants/artifacts";
import type { EquippedItems } from "@/types/inventory";

type SkillTreeProgress = Record<
  string,
  { level?: string; unlockedSkills?: string[] }
>;

export interface ArtifactOption {
  id: string;
  name: string;
  slot: string;
  icon?: string | null;
}

interface CharacterArtifactsSectionProps {
  knownSpellIds: string[];
  campaignId: string;
  characterRace?: string;
  skillTreeProgress?: SkillTreeProgress;
  /** Режим редагування слотів: якщо передано — клік по комірці відкриває меню вибору артефакта */
  characterId?: string;
  equipped?: EquippedItems;
  artifacts?: ArtifactOption[];
  onEquippedChange?: (equipped: EquippedItems) => void;
}

export function CharacterArtifactsSection({
  knownSpellIds,
  campaignId,
  characterRace,
  skillTreeProgress = {},
  characterId,
  equipped = {},
  artifacts = [],
  onEquippedChange,
}: CharacterArtifactsSectionProps) {
  const [updatingSlot, setUpdatingSlot] = useState<string | null>(null);

  const isEditMode =
    characterId != null && artifacts.length >= 0 && onEquippedChange != null;

  const handleSlotChange = async (
    slotKey: string,
    artifactId: string | null,
  ) => {
    if (!characterId || !onEquippedChange) return;

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

  const cellClassName =
    "aspect-square rounded border-2 border-amber-700/80 bg-stone-900/60 shadow-inner flex flex-col items-center justify-center text-center p-1 overflow-hidden " +
    (isEditMode
      ? "cursor-pointer hover:bg-stone-800/80 hover:border-amber-600/90 transition-colors"
      : "");

  return (
    <div className="w-full">
      <div className="relative w-full max-w-md mx-auto aspect-square rounded-lg overflow-hidden bg-[#2a2520] border border-amber-900/50 shadow-xl">
        <div className="absolute inset-0">
          <Image
            src="/screen-bg/artefacts-bg.jpg"
            alt=""
            fill
            className="object-cover opacity-40 sepia"
            sizes="(max-width: 448px) 100vw, 448px"
            priority={false}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-900/30 to-stone-950/50" />
        </div>

        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="grid grid-cols-3 grid-rows-3 gap-2 w-full h-full max-w-[280px] max-h-[280px]">
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

              const content = equippedArtifact ? (
                <div className="absolute inset-0 flex flex-col overflow-hidden rounded">
                  {equippedArtifact.icon ? (
                    <img
                      src={equippedArtifact.icon}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted/80 text-lg font-medium text-amber-200">
                      {equippedArtifact.name[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-center text-[9px] uppercase text-amber-200/90">
                    {cell.label}
                  </span>
                </div>
              ) : (
                <>
                  <span className="text-[10px] uppercase text-amber-200/80 leading-tight">
                    {cell.label}
                  </span>
                  <span className="text-xs font-medium text-amber-100 truncate w-full mt-0.5">
                    —
                  </span>
                </>
              );

              const slotTitle = equippedArtifact
                ? `${cell.label}: ${equippedArtifact.name}`
                : cell.label;

              if (isEditMode) {
                return (
                  <DropdownMenu key={cell.key}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        disabled={isUpdating}
                        className={
                          cellClassName + " relative disabled:opacity-50"
                        }
                        title={slotTitle}
                      >
                        {content}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="center"
                      className="min-w-[180px]"
                    >
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
                            className="flex items-center gap-2"
                          >
                            {a.icon ? (
                              <img
                                src={a.icon}
                                alt=""
                                className="h-5 w-5 shrink-0 rounded object-cover"
                              />
                            ) : (
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-medium">
                                {a.name[0]?.toUpperCase() ?? "?"}
                              </span>
                            )}
                            <span className="truncate">{a.name}</span>
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }

              return (
                <div
                  key={cell.key}
                  className={cellClassName + " relative"}
                  title={slotTitle}
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>

        <CharacterSpellbook
          knownSpellIds={knownSpellIds}
          campaignId={campaignId}
          characterRace={characterRace}
          skillTreeProgress={skillTreeProgress}
        />
      </div>
    </div>
  );
}
