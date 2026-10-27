"use client";

import { ShowDeckStrip } from "./ShowDeckStrip";
import { ShowTransport } from "./ShowTransport";

import { WorldMapLink } from "@/components/world/WorldMapLink";
import type { ShowControl } from "@/lib/hooks/show";
import type { ShowState } from "@/types/show";

export function ShowControlPanel({ campaignId, show, control }: { campaignId: string; show: ShowState | null; control: ShowControl }) {
  return (
    <div className="min-w-0 space-y-3 border-t border-hud-rule bg-black/60 p-3 text-hud-bone">
      <ShowTransport campaignId={campaignId} show={show} control={control} />
      <ShowDeckStrip campaignId={campaignId} show={show} control={control} />
      <div className="flex justify-end">
        <WorldMapLink campaignId={campaignId} variant="button" newTab />
      </div>
    </div>
  );
}
