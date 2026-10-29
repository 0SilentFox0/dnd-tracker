"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { EntityIcon } from "@/components/common/EntityIcon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ARTIFACT_GRID_9, ArtifactSlot } from "@/lib/constants/artifacts";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import { useEquipArtifact } from "@/lib/hooks/characters";
import { useNotify } from "@/lib/hooks/common";
import { canEquipOffHand } from "@/lib/utils/artifacts/off-hand";
import { isPropertyRow, isUniqueRow } from "@/lib/utils/items/item-row";
import { resolveItemRow } from "@/lib/utils/items/resolve";
import type { EquippedItems } from "@/types/inventory";

export interface ArtifactOption {
  id: string;
  name: string;
  slot: string;
  icon?: string | null;
  modifiers?: unknown;
}

interface CharacterArtifactsSectionProps {
  campaignId: string;
  characterId: string;
  equipped: EquippedItems;
  artifacts: ArtifactOption[];
  holders?: Record<string, string>;
  onEquippedChange: (equipped: EquippedItems) => void;
}

function optionFor(ref: string, artifacts: ArtifactOption[]): ArtifactOption | undefined {
  const direct = artifacts.find((a) => a.id === ref);

  if (direct) return direct;

  return resolveItemRow(ref, new Map(artifacts.map((a) => [a.id, a]))) ?? undefined;
}

const CELL =
  "relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded border-2 border-amber-700/80 bg-stone-900/60 p-1 text-center shadow-inner transition-colors hover:border-amber-600/90 hover:bg-stone-800/80 disabled:opacity-50";

export function CharacterArtifactsSection({ campaignId, characterId, equipped, artifacts, holders, onEquippedChange }: CharacterArtifactsSectionProps) {
  const t = useTranslations("inventory");

  const notify = useNotify();

  const equip = useEquipArtifact(campaignId, characterId);

  const classesEnabled = !!useCampaignRules(campaignId).data?.classes.enabled;

  const [updatingSlot, setUpdatingSlot] = useState<string | null>(null);

  const handleSlotChange = (slotKey: string, artifactId: string | null) => {
    setUpdatingSlot(slotKey);
    equip.mutate(
      { slot: slotKey, artifactId },
      {
        onSuccess: (saved) => onEquippedChange(saved.equipped ?? {}),
        onError: (e) => void notify(e.message || t("errors.equipFailed")),
        onSettled: () => setUpdatingSlot(null),
      },
    );
  };

  return (
    <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-lg border border-amber-900/50 bg-[#2a2520] shadow-xl">
      <div className="absolute inset-0">
        <Image src="/screen-bg/artefacts-bg.webp" alt="" fill className="object-cover opacity-40 sepia" sizes="(max-width: 448px) 100vw, 448px" />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/30 to-stone-950/50" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="grid h-full max-h-[280px] w-full max-w-[280px] grid-cols-3 grid-rows-3 gap-2">
          {ARTIFACT_GRID_9.map((cell) => {
            const label = t(`grid.slots.${cell.key}`);

            const equippedId = equipped[cell.key] as string | undefined;

            const current = equippedId ? optionFor(equippedId, artifacts) : undefined;

            const available = artifacts.filter(
              (a) =>
                !isPropertyRow(a) &&
                (a.slot === cell.slotType ||
                (cell.slotType === ArtifactSlot.WEAPON && a.slot === ArtifactSlot.RANGE_WEAPON) ||
                (cell.slotType === ArtifactSlot.SHIELD && canEquipOffHand(a, classesEnabled))),
            );

            return (
              <DropdownMenu key={cell.key}>
                <DropdownMenuTrigger asChild>
                  <button type="button" disabled={updatingSlot === cell.key} className={CELL} title={current ? t("grid.filled", { slot: label, name: current.name }) : label}>
                    {current ? (
                      <>
                        <EntityIcon src={current.icon} name={current.name} size={80} className="absolute inset-0 size-full rounded bg-muted/80 text-lg font-medium text-amber-200" />
                        <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[9px] uppercase text-amber-200/90">{label}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] uppercase leading-tight text-amber-200/80">{label}</span>
                        <span className="mt-0.5 w-full truncate text-xs font-medium text-amber-100">—</span>
                      </>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="min-w-[180px]">
                  <DropdownMenuItem onClick={() => handleSlotChange(cell.key, null)}>{t("equipment.none")}</DropdownMenuItem>
                  {available.length === 0 ? (
                    <DropdownMenuItem disabled>{t("equipment.noArtifacts")}</DropdownMenuItem>
                  ) : (
                    available.map((a) => {
                      const holder = holders?.[a.id];

                      const wornElsewhere = isUniqueRow(a) && Object.entries(equipped).some(([key, id]) => id === a.id && key !== cell.key);

                      return (
                        <DropdownMenuItem key={a.id} disabled={Boolean(holder) || wornElsewhere} onClick={() => handleSlotChange(cell.key, a.id)} className="flex items-center gap-2">
                          <EntityIcon src={a.icon} name={a.name} size={20} className="size-5 rounded text-[10px] font-medium" />
                          <span className="truncate">{a.name}</span>
                          {holder && <span className="ml-auto text-xs text-muted-foreground">{t("equipment.heldBy", { holder })}</span>}
                          {!holder && wornElsewhere && <span className="ml-auto text-xs text-muted-foreground">{t("equipment.worn")}</span>}
                        </DropdownMenuItem>
                      );
                    })
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
