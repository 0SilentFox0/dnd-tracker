"use client";

import { useState } from "react";

import { ExperienceDialog } from "./ExperienceDialog";
import { RestDialog } from "./RestDialog";

import { Button } from "@/components/ui/button";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import { useRest } from "@/lib/hooks/characters";
import type { CharacterListItem } from "@/types/characters";

export function PartyRestActions({ campaignId, characters }: { campaignId: string; characters: CharacterListItem[] }) {
  const { data: rules } = useCampaignRules(campaignId);

  const rest = useRest(campaignId);

  const [open, setOpen] = useState<"rest" | "xp" | null>(null);

  const ooc = rules?.outOfCombat;

  if (!ooc || characters.length === 0 || (!ooc.persistResources && !ooc.xp)) return null;

  const resting = characters.filter((c) => c.resources?.shortRestOpen).map((c) => c.id);

  return (
    <>
      {ooc.persistResources && (
        <Button type="button" variant="outline" onClick={() => setOpen("rest")}>
          Відпочинок
        </Button>
      )}
      {ooc.persistResources && resting.length > 0 && (
        <Button type="button" variant="outline" disabled={rest.isPending} onClick={() => void rest.mutateOk({ kind: "close", characterIds: resting })}>
          Завершити відпочинок
        </Button>
      )}
      {ooc.xp && (
        <Button type="button" variant="outline" onClick={() => setOpen("xp")}>
          Досвід
        </Button>
      )}
      {open === "rest" && <RestDialog campaignId={campaignId} characters={characters} open onOpenChange={(o) => !o && setOpen(null)} />}
      {open === "xp" && <ExperienceDialog campaignId={campaignId} characters={characters} open onOpenChange={(o) => !o && setOpen(null)} />}
    </>
  );
}
