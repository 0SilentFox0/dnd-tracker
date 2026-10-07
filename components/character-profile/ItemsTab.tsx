"use client";

import { useState } from "react";

import { useProfile } from "./ProfileContext";
import { Section } from "./Section";
import { SetList } from "./SetList";

import { EntityIcon } from "@/components/common/EntityIcon";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ARTIFACT_GRID_9, ArtifactRarity } from "@/lib/constants/artifacts";
import { cn } from "@/lib/utils";
import type { SheetArtifact } from "@/types/characters";

const RARITY_RING: Record<string, string> = {
  [ArtifactRarity.UNCOMMON]: "border-[#7cbf5a]",
  [ArtifactRarity.RARE]: "border-[#8fd0e8]",
  [ArtifactRarity.EPIC]: "border-[#c08ff0]",
  [ArtifactRarity.LEGENDARY]: "border-[#e6c25a]",
};

export function ItemsTab() {
  const { sheet } = useProfile();

  const [shown, setShown] = useState<SheetArtifact | null>(null);

  const [open, setOpen] = useState(false);

  const show = (a: SheetArtifact) => {
    setShown(a);
    setOpen(true);
  };

  return (
    <>
      <div className="mx-auto grid w-[216px] max-w-full grid-cols-3 gap-1.5">
        {ARTIFACT_GRID_9.map((cell) => {
          const a = sheet.items.grid[cell.key];

          return a ? (
            <button key={cell.key} type="button" aria-label={`${cell.label}: ${a.name}`} onClick={() => show(a)} className={cn("flex aspect-square items-center justify-center overflow-hidden rounded-lg border-2 bg-hud-field", RARITY_RING[a.rarity ?? ""] ?? "border-hud-line")}>
              <EntityIcon src={a.icon} name={a.name} size={68} className="hud-sc size-full rounded-none bg-transparent text-inherit" />
            </button>
          ) : (
            <span key={cell.key} className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-hud-rule text-center text-[10px] leading-tight text-[#5d5346]">
              {cell.label}
            </span>
          );
        })}
      </div>
      <Section title="ЩО ДАЮТЬ РЕЧІ">
        {sheet.items.artifacts.length === 0 && <p className="text-sm text-hud-muted">Нічого не вдягнено.</p>}
        <ul>
          {sheet.items.artifacts.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => show(a)} className="flex min-h-11 w-full items-start gap-2 border-b border-[#2a2218] py-2 text-left">
                <EntityIcon src={a.icon} name={a.name} size={32} className="hud-sc size-8 rounded-md border border-hud-line bg-transparent text-inherit" />
                <span className="min-w-0">
                  <span className="block text-sm text-hud-ink">{a.name}</span>
                  <span className="block text-xs text-hud-muted">{a.effects.length ? a.effects.join(" · ") : "без ефектів"}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <SetList sets={sheet.items.sets} />
      </Section>
      <ResponsiveDialog open={open} onOpenChange={setOpen} title={shown?.name ?? ""}>
        {shown?.description && <p className="text-sm">{shown.description}</p>}
        {shown && shown.effects.length > 0 ? (
          <ul className="mt-2 list-disc pl-5 text-sm">
            {shown.effects.map((e, i) => (
              <li key={`${i}-${e}`}>{e}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Без ефектів.</p>
        )}
      </ResponsiveDialog>
    </>
  );
}
