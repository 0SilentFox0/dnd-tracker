"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import { useProfile } from "../ProfileContext";

import { Button } from "@/components/ui/button";
import { openSpellPicks } from "@/lib/utils/characters/classes";

const ChoicesDialog = dynamic(() => import("../ChoicesDialog"), { ssr: false });

export function SpellPicksNudge({ onPick }: { onPick?: () => void }) {
  const { campaignId, characterId, sheet } = useProfile();

  const t = useTranslations("characterProfile.path");

  const [open, setOpen] = useState(false);

  const count = openSpellPicks(sheet.classProgression);

  if (count === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hud-gold-strong/60 p-3">
      <p className="text-sm text-hud-gold-strong">{t("spellNudge", { count })}</p>
      {sheet.choices?.canEdit ? (
        <Button type="button" size="sm" onClick={onPick ?? (() => setOpen(true))}>
          {t("spellNudgeAction")}
        </Button>
      ) : null}
      {open && !onPick ? <ChoicesDialog open={open} onOpenChange={setOpen} campaignId={campaignId} characterId={characterId} /> : null}
    </div>
  );
}
