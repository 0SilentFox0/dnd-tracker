"use client";

import { useState } from "react";

import { useProfile } from "./ProfileContext";
import { Section } from "./Section";

import { OptimizedImage } from "@/components/common/OptimizedImage";
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

function Icon({ a, size }: { a: SheetArtifact; size: number }) {
  return a.icon ? <OptimizedImage src={a.icon} alt="" width={size} height={size} className="size-full object-cover" /> : <span className="hud-sc">{a.name[0]}</span>;
}

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
            <button key={cell.key} type="button" aria-label={`${cell.label}: ${a.name}`} onClick={() => show(a)} className={cn("flex aspect-square items-center justify-center overflow-hidden rounded-lg border-2 bg-[#1a140f]", RARITY_RING[a.rarity ?? ""] ?? "border-[#4a3c2c]")}>
              <Icon a={a} size={68} />
            </button>
          ) : (
            <span key={cell.key} className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-[#3a2e22] text-center text-[10px] leading-tight text-[#5d5346]">
              {cell.label}
            </span>
          );
        })}
      </div>
      <Section title="ЩО ДАЮТЬ РЕЧІ">
        {sheet.items.artifacts.length === 0 && <p className="text-sm text-[#8f8473]">Нічого не вдягнено.</p>}
        <ul>
          {sheet.items.artifacts.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => show(a)} className="flex min-h-11 w-full items-start gap-2 border-b border-[#2a2218] py-2 text-left">
                <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#4a3c2c]">
                  <Icon a={a} size={32} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-[#efe5d2]">{a.name}</span>
                  <span className="block text-xs text-[#8f8473]">{a.effects.length ? a.effects.join(" · ") : "без ефектів"}</span>
                </span>
              </button>
            </li>
          ))}
          {sheet.items.sets.map((s) => (
            <li key={s.id} className="border-b border-[#2a2218] py-2">
              <span className={cn("block text-sm", s.complete ? "text-[#e6c25a]" : "text-[#efe5d2]")}>
                ✦ Сет «{s.name}» {s.have}/{s.total}
              </span>
              <span className="block text-xs text-[#8f8473]">{s.complete ? s.effects.join(" · ") : `З повним сетом: ${s.effects.join(" · ") || "—"}`}</span>
            </li>
          ))}
        </ul>
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
