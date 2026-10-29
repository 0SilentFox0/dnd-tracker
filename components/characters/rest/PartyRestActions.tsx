"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ExperienceDialog } from "./ExperienceDialog";
import { RestDialog } from "./RestDialog";

import { Button } from "@/components/ui/button";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import { useRest } from "@/lib/hooks/characters";
import type { CharacterListItem } from "@/types/characters";

export function PartyRestActions({ campaignId, characters }: { campaignId: string; characters: CharacterListItem[] }) {
  const t = useTranslations("rest.party");

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
          {t("rest")}
        </Button>
      )}
      {ooc.persistResources && resting.length > 0 && (
        <Button type="button" variant="outline" disabled={rest.isPending} onClick={() => void rest.mutateOk({ kind: "close", characterIds: resting })}>
          {t("closeRest")}
        </Button>
      )}
      {ooc.xp && (
        <Button type="button" variant="outline" onClick={() => setOpen("xp")}>
          {t("xp")}
        </Button>
      )}
      {open === "rest" && <RestDialog campaignId={campaignId} characters={characters} open onOpenChange={(o) => !o && setOpen(null)} />}
      {open === "xp" && <ExperienceDialog campaignId={campaignId} characters={characters} open onOpenChange={(o) => !o && setOpen(null)} />}
    </>
  );
}
