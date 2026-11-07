"use client";

import { useTranslations } from "next-intl";

import { EncumbranceBar } from "./EncumbranceBar";

import { HudSection } from "@/components/hud/form";
import { HudStatChip } from "@/components/hud/page";
import { useEncumbrance, useEquippedAp } from "@/lib/hooks/systems/wfrp";

const LOCATIONS = ["head", "arm", "body", "leg"] as const;

export function EquippedArmourSummary({ campaignId, characterId }: { campaignId: string; characterId: string }) {
  const t = useTranslations("wfrpEquipment.summary");

  const tl = useTranslations("wfrpEquipment.locations");

  const equipped = useEquippedAp(campaignId, characterId);

  const load = useEncumbrance(campaignId, characterId);

  if (!equipped) return null;

  return (
    <HudSection title={t("title")}>
      <div className="grid grid-cols-4 gap-2">
        {LOCATIONS.map((l) => (
          <HudStatChip key={l} label={tl(l)} short={tl(l)} value={String(equipped.ap[l])} />
        ))}
      </div>
      <ul className="mt-2 space-y-1 text-sm text-hud-muted">
        <li>{t("penalty", { sl: equipped.penalty })}</li>
        {equipped.flexible && <li>{t("flexible")}</li>}
        {equipped.shield > 0 && <li>{t("shield", { value: equipped.shield })}</li>}
      </ul>
      {load && <EncumbranceBar {...load} />}
    </HudSection>
  );
}
