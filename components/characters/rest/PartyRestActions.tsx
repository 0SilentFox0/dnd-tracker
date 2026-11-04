"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ExperienceDialog } from "./ExperienceDialog";
import { RestDialog } from "./RestDialog";

import { Button } from "@/components/ui/button";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import { useRest } from "@/lib/hooks/characters";
import { useConfirm } from "@/lib/hooks/common";
import { useRuleSystem } from "@/lib/hooks/systems";
import type { CharacterListItem } from "@/types/characters";

export function PartyRestActions({ campaignId, characters }: { campaignId: string; characters: CharacterListItem[] }) {
  const t = useTranslations("rest.party");

  const { data: rules } = useCampaignRules(campaignId);

  const rest = useRest(campaignId);

  const confirm = useConfirm();

  const { system } = useRuleSystem({ campaignId });

  const [open, setOpen] = useState<"rest" | "xp" | null>(null);

  const ooc = rules?.outOfCombat;

  if (!ooc || characters.length === 0 || (!ooc.persistResources && !ooc.xp)) return null;

  const startSession = () =>
    confirm({
      title: t("sessionConfirmTitle"),
      description: t("sessionConfirm"),
      confirmLabel: t("session"),
      onConfirm: async () => {
        await rest.mutateOk({ kind: "session", characterIds: characters.map((c) => c.id) });
      },
    });

  const resting = characters.filter((c) => c.resources?.shortRestOpen).map((c) => c.id);

  return (
    <>
      {ooc.persistResources && system?.rest.kinds && (
        <Button type="button" variant="outline" onClick={() => setOpen("rest")}>
          {t("rest")}
        </Button>
      )}
      {ooc.persistResources && system?.rest.kinds && resting.length > 0 && (
        <Button type="button" variant="outline" disabled={rest.isPending} onClick={() => void rest.mutateOk({ kind: "close", characterIds: resting })}>
          {t("closeRest")}
        </Button>
      )}
      {ooc.persistResources && system?.rest.onSession && (
        <Button type="button" variant="outline" disabled={rest.isPending} onClick={startSession}>
          {t("session")}
        </Button>
      )}
      {ooc.xp && (
        <Button type="button" variant="outline" onClick={() => setOpen("xp")}>
          {t("xp")}
        </Button>
      )}
      {open === "rest" && system?.rest.kinds && <RestDialog campaignId={campaignId} characters={characters} open onOpenChange={(o) => !o && setOpen(null)} />}
      {open === "xp" && <ExperienceDialog campaignId={campaignId} characters={characters} open onOpenChange={(o) => !o && setOpen(null)} />}
    </>
  );
}
