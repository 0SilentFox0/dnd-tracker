"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import { useProfile } from "./ProfileContext";

import { HudPill } from "@/components/hud/page";
import { Button } from "@/components/ui/button";

const ChoicesDialog = dynamic(() => import("./ChoicesDialog"), { ssr: false });

export function PendingChoicesBadge() {
  const { campaignId, characterId, sheet } = useProfile();

  const t = useTranslations("characterProfile.choices");

  const [open, setOpen] = useState(false);

  const pending = sheet.choices?.pending ?? 0;

  if (pending === 0) return null;

  return (
    <span className="inline-flex items-center gap-2">
      <HudPill tone="accent">{t("pending", { pending })}</HudPill>
      {sheet.choices?.canEdit && (
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          {t("pick")}
        </Button>
      )}
      <ChoicesDialog open={open} onOpenChange={setOpen} campaignId={campaignId} characterId={characterId} />
    </span>
  );
}
