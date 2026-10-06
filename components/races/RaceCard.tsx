"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Circle, Edit, MoreVertical, Plus, Shield, Trash2 } from "lucide-react";

import { HudCard } from "@/components/hud/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMainSkills, useSkills } from "@/lib/hooks/skills";
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
  const { data: allSkills = [] } = useSkills(campaignId);

  const { data: mainSkills = [] } = useMainSkills(campaignId);

  const availableSkillsCount = useMemo(() => countRaceSkills(race, allSkills), [race, allSkills]);

  const disabledSkillsCount = Array.isArray(race.disabledSkills) ? race.disabledSkills.length : 0;

  const availableMainSkillsForDisplay = useMemo(() => raceMainSkillsForDisplay(race, mainSkills), [race, mainSkills]);

  const passiveAbility = normalizePassiveAbility(race);

  const modifiedAbilities = modifiedAbilityScores(passiveAbility);

  return (
    <HudCard accent={race.color ?? undefined} className="flex h-full flex-col gap-3">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="hud-sc truncate text-lg text-[#efe5d2]">{race.name}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/campaigns/${campaignId}/dm/races/${race.id}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Редагувати
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(race.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Видалити
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">Доступні навики:</p>
          <div className="flex flex-wrap gap-2">
            {availableMainSkillsForDisplay.map((ms) => (
              <span
                key={ms.id}
                className="inline-flex items-center rounded-full px-2 text-xs text-[#e6dccb]"
                style={{ boxShadow: `inset 0 0 0 1px ${ms.color}` }}
                title={ms.name}
              >
                {ms.name}
              </span>
            ))}
            {availableMainSkillsForDisplay.length === 0 && (
              <span className="text-sm text-muted-foreground italic">
                Немає обмежень (усі групи)
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Скілів: {availableSkillsCount}</Badge>
          {disabledSkillsCount > 0 && (
            <Badge variant="outline">Відключені: {disabledSkillsCount}</Badge>
          )}
        </div>

        {passiveAbility && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Пасивна здібність:</p>
            <p className="text-sm text-muted-foreground">
              {passiveAbility.description}
            </p>
            {modifiedAbilities.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium mb-2">
                  Модифікатори характеристик:
                </p>
                <div className="flex flex-wrap gap-2">
                  {modifiedAbilities.map((ability) => {
                    const modifiers =
                      passiveAbility.statModifiers?.[ability.key];

                    // Визначаємо яку іконку показувати (тільки одну)
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
                        className="flex items-center gap-1.5 rounded-md bg-[#1a140f] px-2 py-1"
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
                                ? "Бонус"
                                : iconToShow === "nonNegative"
                                  ? "Невід'ємне (мін. 0)"
                                  : "Завжди 0"
                            }
                          >
                            {iconToShow === "bonus" && (
                              <Plus className="h-3 w-3 text-[#e6c25a]" />
                            )}
                            {iconToShow === "nonNegative" && (
                              <Shield className="h-3 w-3 text-[#8fd0e8]" />
                            )}
                            {iconToShow === "alwaysZero" && (
                              <Circle
                                className="h-3 w-3 text-[#d0705c]"
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
                <p className="text-sm font-medium">Покращення характеристик:</p>
                <p className="text-sm text-muted-foreground">
                  {passiveAbility.statImprovements}
                </p>
              </div>
            )}
          </div>
        )}

        {!passiveAbility && (
          <p className="text-sm text-muted-foreground italic">
            Пасивна здібність не вказана
          </p>
        )}
      </div>
    </HudCard>
  );
}
