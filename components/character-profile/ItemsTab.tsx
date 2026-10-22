"use client";

import { useState } from "react";

import { useProfile } from "./ProfileContext";
import { SetList } from "./SetList";
import { TransferArtifactDialog } from "./TransferArtifactDialog";

import { EntityIcon } from "@/components/common/EntityIcon";
import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ARTIFACT_GRID_9, ARTIFACT_RARITY_COLOR } from "@/lib/constants/artifacts";
import { useStashAction } from "@/lib/hooks/characters";
import { useNotify } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import type { SheetArtifact } from "@/types/characters";

export function ItemsTab() {
  const { sheet, campaignId, characterId } = useProfile();

  const stash = useStashAction(campaignId, characterId);

  const notify = useNotify();

  const canAct = sheet.viewer.isDM || sheet.viewer.isOwner;

  const [shown, setShown] = useState<SheetArtifact | null>(null);

  const [open, setOpen] = useState(false);

  const [transferOpen, setTransferOpen] = useState(false);

  const show = (a: SheetArtifact) => {
    setShown(a);
    setOpen(true);
  };

  const unequip = (slot: string) =>
    stash.mutateAsync({ action: "stash", slot }).then(
      () => setOpen(false),
      (e: Error) => notify(e.message || "Не вдалося зняти артефакт"),
    );

  return (
    <>
      <div className="mx-auto grid w-[216px] max-w-full grid-cols-3 gap-1.5">
        {ARTIFACT_GRID_9.map((cell) => {
          const a = sheet.items.grid[cell.key];

          return a ? (
            <button key={cell.key} type="button" aria-label={`${cell.label}: ${a.name}`} onClick={() => show(a)} className={cn("flex aspect-square items-center justify-center overflow-hidden rounded-lg border-2 bg-hud-field", ARTIFACT_RARITY_COLOR[a.rarity ?? ""] ?? "border-hud-line")}>
              <EntityIcon src={a.icon} name={a.name} size={68} className="hud-sc size-full rounded-none bg-transparent text-inherit" />
            </button>
          ) : (
            <span key={cell.key} className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-hud-rule text-center text-[10px] leading-tight text-[#5d5346]">
              {cell.label}
            </span>
          );
        })}
      </div>
      <HudSection title="ЩО ДАЮТЬ РЕЧІ">
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
      </HudSection>
      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title={shown?.name ?? ""}
        footer={
          <>
            {canAct && shown && (
              <Button variant="outline" disabled={stash.isPending} onClick={() => void unequip(shown.slot)}>
                Зняти в підсумок
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setTransferOpen(true);
              }}
            >
              Передати
            </Button>
          </>
        }
      >
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
      <TransferArtifactDialog artifact={shown} source={{ slot: shown?.slot ?? "" }} open={transferOpen} onOpenChange={setTransferOpen} />
    </>
  );
}
