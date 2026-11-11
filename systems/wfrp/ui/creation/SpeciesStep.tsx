"use client";

import { useTranslations } from "next-intl";

import { OptionCard } from "./OptionCard";
import type { WfrpDraftFormState } from "./types";

import { EmptyState, LoadingState } from "@/components/common/states";
import type { CharacteristicKey } from "@/lib/utils/rules/systems";

export function SpeciesStep({ form }: { form: WfrpDraftFormState }) {
  const t = useTranslations("wfrpCreation.species");

  const tg = useTranslations("gameTerms.characteristics");

  const { data, selected, select, loading } = form.species;

  if (loading) return <LoadingState label={t("loading")} />;

  if (!data.length) return <EmptyState title={t("notReadyTitle")} description={t("notReadyBody")} />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-hud-muted">{t("hint")}</p>
      <div role="radiogroup" aria-label={form.step.id} className="grid gap-2">
        {data.map(({ race, profile }) => {
          const mods = (Object.entries(profile.mods) as [CharacteristicKey, number | undefined][]).filter(([, v]) => v).map(([k, v]) => `${(v ?? 0) > 0 ? "+" : ""}${v} ${tg(`${k}.short`)}`);

          return (
            <OptionCard key={race.id} selected={selected === race.id} onSelect={() => select(race.id)}>
              <b className="block">{race.name}</b>
              <span className="block text-hud-muted">{t("stats", { move: profile.move, fate: profile.fate, wounds: profile.extraWounds })}</span>
              <span className="block text-hud-muted">{t("mods", { mods: mods.length ? mods.join(", ") : t("noMods") })}</span>
              {profile.talents.length > 0 && <span className="block text-hud-muted">{t("talents", { names: profile.talents.map(form.talents.names).join(", ") })}</span>}
            </OptionCard>
          );
        })}
      </div>
    </div>
  );
}
