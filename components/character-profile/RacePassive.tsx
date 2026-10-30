"use client";

import { useTranslations } from "next-intl";

import { useProfile } from "./ProfileContext";

import { EntityIcon } from "@/components/common/EntityIcon";
import { RacePassiveBlock } from "@/components/races/RaceInnateSections";
import { useRaces } from "@/lib/hooks/races";
import { normalizePassiveAbility } from "@/lib/utils/races/race-summary";

export function RacePassive() {
  const { campaignId, sheet } = useProfile();

  const t = useTranslations("characterProfile.skills");

  const { data: races = [] } = useRaces(campaignId);

  const race = races.find((r) => r.name.trim() === sheet.identity.race.trim());

  const passive = race ? normalizePassiveAbility(race) : null;

  if (!passive) return null;

  return (
    <section className="mb-3 rounded-[10px] border border-hud-gold/40 bg-hud-field p-3">
      <p className="mb-2 flex items-center gap-2 text-[11px] uppercase text-hud-gold">
        <EntityIcon src={sheet.identity.raceIcon} name={sheet.identity.race} className="size-6 text-xs" />
        {t("race", { race: sheet.identity.race })}
      </p>
      <RacePassiveBlock passive={passive} />
    </section>
  );
}
