"use client";

import { useProfile } from "./ProfileContext";

import { RacePassiveBlock } from "@/components/races/RaceInnateSections";
import { useRaces } from "@/lib/hooks/races";
import { normalizePassiveAbility } from "@/lib/utils/races/race-summary";

export function RacePassive() {
  const { campaignId, sheet } = useProfile();

  const { data: races = [] } = useRaces(campaignId);

  const race = races.find((r) => r.name.trim() === sheet.identity.race.trim());

  const passive = race ? normalizePassiveAbility(race) : null;

  if (!passive) return null;

  return (
    <section className="mb-3 rounded-[10px] border border-hud-gold/40 bg-hud-field p-3">
      <p className="mb-2 text-[11px] uppercase text-hud-gold">Раса: {sheet.identity.race}</p>
      <RacePassiveBlock passive={passive} />
    </section>
  );
}
