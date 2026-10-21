"use client";

import { ChevronLeft, ChevronRight, EyeOff, Square } from "lucide-react";

import { SHOW_TONE, ShowButton } from "./show-ui";

import { useConfirm } from "@/lib/hooks/common";
import { type ShowControl, useDeck } from "@/lib/hooks/show";
import { cn } from "@/lib/utils";
import type { ShowState } from "@/types/show";

export function ShowTransport({ campaignId, show, control }: { campaignId: string; show: ShowState | null; control: ShowControl }) {
  const confirm = useConfirm();

  const { data: deck } = useDeck(campaignId, show?.deckId ?? null);

  const running = !!show?.deckId;

  const at = deck && show?.slide ? deck.slides.findIndex((s) => s.id === show.slide?.id) : -1;

  const end = async () => {
    if (await confirm({ title: "Завершити показ?", description: "Гравці побачать заглушку або очікування, музика зупиниться.", confirmLabel: "Завершити", destructive: true })) void control.send({ action: "end" });
  };

  return (
    <div className="flex items-center gap-0.5">
      <ShowButton aria-label="Попередній слайд (←)" title="Попередній слайд (←)" disabled={!running || control.pending || at === 0} onClick={() => void control.send({ action: "prev" })}>
        <ChevronLeft className="size-4" />
      </ShowButton>
      <span className={cn("min-w-9 text-center text-xs tabular-nums", SHOW_TONE.muted)}>{at >= 0 ? `${at + 1}/${deck?.slides.length}` : "—"}</span>
      <ShowButton aria-label="Наступний слайд (→)" title="Наступний слайд (→)" disabled={!running || control.pending || (!!deck && at === deck.slides.length - 1)} onClick={() => void control.send({ action: "next" })}>
        <ChevronRight className="size-4" />
      </ShowButton>
      <ShowButton aria-pressed={!!show?.curtain} aria-label="Заглушка" title="Заглушка замість слайда (B)" disabled={control.pending} onClick={() => void control.send({ action: "curtain" })}>
        <EyeOff className="size-4" />
      </ShowButton>
      <ShowButton tone="danger" aria-label="Завершити показ" title="Завершити показ" disabled={control.pending || (!running && !show?.battle)} onClick={() => void end()}>
        <Square className="size-4" />
      </ShowButton>
    </div>
  );
}
