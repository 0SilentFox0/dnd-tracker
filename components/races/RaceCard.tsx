"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Circle, Edit, Plus, Shield, Trash2 } from "lucide-react";

import { RacePassiveBlock } from "./RaceInnateSections";

import { ActionsMenu } from "@/components/common/ActionsMenu";
import { HudCard } from "@/components/hud/page";
import { Badge } from "@/components/ui/badge";
import { useMainSkills, useRacialSkills, useSkills } from "@/lib/hooks/skills";
import {
  countRaceSkills,
  modifiedAbilityScores,
  normalizePassiveAbility,
  raceMainSkillsForDisplay,
} from "@/lib/utils/races/race-summary";
import type { Race } from "@/types/races";

interface RaceCardProps {
  race: Race;
  campaignId: string;
  onDelete: (raceId: string) => void;
}

export function RaceCard({ race, campaignId, onDelete }: RaceCardProps) {
  const t = useTranslations("races");

  const tc = useTranslations("common");

  const { data: allSkills = [] } = useSkills(campaignId);

  const { data: mainSkills = [] } = useMainSkills(campaignId);

  const { treeSkillCount } = useRacialSkills(campaignId, race.name);

  const availableSkillsCount = useMemo(() => countRaceSkills(race, allSkills, treeSkillCount), [race, allSkills, treeSkillCount]);

  const disabledSkillsCount = Array.isArray(race.disabledSkills) ? race.disabledSkills.length : 0;

  const availableMainSkillsForDisplay = useMemo(() => raceMainSkillsForDisplay(race, mainSkills), [race, mainSkills]);

  const passiveAbility = normalizePassiveAbility(race);

  const modifiedAbilities = modifiedAbilityScores(passiveAbility);

  return (
    <HudCard accent={race.color ?? undefined} className="flex h-full flex-col gap-3">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="hud-sc truncate text-lg text-hud-ink">{race.name}</h3>
          </div>
          <ActionsMenu
            triggerSize="sm"
            triggerClassName="h-8 w-8 p-0"
            actions={[
              { label: tc("actions.edit"), icon: Edit, href: `/campaigns/${campaignId}/dm/races/${race.id}` },
              { label: tc("actions.delete"), icon: Trash2, onSelect: () => onDelete(race.id), destructive: true },
            ]}
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("card.availableSkills")}</p>
          <div className="flex flex-wrap gap-2">
            {availableMainSkillsForDisplay.map((ms) => (
              <span
                key={ms.id}
                className="inline-flex items-center rounded-full px-2 text-xs text-hud-bone"
                style={{ boxShadow: `inset 0 0 0 1px ${ms.color}` }}
                title={ms.name}
              >
                {ms.name}
              </span>
            ))}
            {availableMainSkillsForDisplay.length === 0 && (
              <span className="text-sm text-muted-foreground italic">
                {t("card.noRestrictions")}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{t("card.skillsCount", { count: availableSkillsCount })}</Badge>
          {disabledSkillsCount > 0 && (
            <Badge variant="outline">{t("card.disabledCount", { count: disabledSkillsCount })}</Badge>
          )}
        </div>

        {passiveAbility && (
          <div className="space-y-2">
            <RacePassiveBlock passive={passiveAbility} />
            {modifiedAbilities.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium mb-2">
                  {t("card.statModifiers")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {modifiedAbilities.map((ability) => {
                    const modifiers =
                      passiveAbility.statModifiers?.[ability.key];

                    let iconToShow:
                      | "bonus"
                      | "nonNegative"
                      | "alwaysZero"
                      | null = null;

                    if (modifiers?.alwaysZero) {
                      iconToShow = "alwaysZero";
                    } else if (modifiers?.nonNegative) {
                      iconToShow = "nonNegative";
                    } else if (modifiers?.bonus) {
                      iconToShow = "bonus";
                    }

                    return (
                      <div
                        key={ability.key}
                        className="flex items-center gap-1.5 rounded-md bg-hud-field px-2 py-1"
                        title={ability.label}
                      >
                        <span className="text-xs font-semibold">
                          {ability.abbreviation}
                        </span>
                        {iconToShow && (
                          <div
                            className="flex items-center"
                            title={
                              iconToShow === "bonus"
                                ? t("card.modBonus")
                                : iconToShow === "nonNegative"
                                  ? t("card.modNonNegative")
                                  : t("card.modAlwaysZero")
                            }
                          >
                            {iconToShow === "bonus" && (
                              <Plus className="h-3 w-3 text-hud-gold-strong" />
                            )}
                            {iconToShow === "nonNegative" && (
                              <Shield className="h-3 w-3 text-[#8fd0e8]" />
                            )}
                            {iconToShow === "alwaysZero" && (
                              <Circle
                                className="h-3 w-3 text-hud-danger"
                                strokeWidth={2}
                                fill="none"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {passiveAbility.statImprovements && (
              <div className="mt-2">
                <p className="text-sm font-medium">{t("card.statImprovements")}</p>
                <p className="text-sm text-muted-foreground">
                  {passiveAbility.statImprovements}
                </p>
              </div>
            )}
          </div>
        )}


        {!passiveAbility && (
          <p className="text-sm text-muted-foreground italic">
            {t("card.noPassive")}
          </p>
        )}
      </div>
    </HudCard>
  );
}
