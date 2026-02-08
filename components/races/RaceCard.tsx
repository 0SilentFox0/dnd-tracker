"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Circle, Edit, MoreVertical, Plus, Shield, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ABILITY_SCORES } from "@/lib/constants/abilities";
import { useMainSkills } from "@/lib/hooks/useMainSkills";
import { useSkills } from "@/lib/hooks/useSkills";
import {
  getSkillMainSkillId,
  getSkillRaces,
} from "@/lib/utils/skills/skill-helpers";
import type { Race, StatModifier } from "@/types/races";

interface RaceCardProps {
  race: Race;
  campaignId: string;
  onDelete: (raceId: string) => void;
}

export function RaceCard({ race, campaignId, onDelete }: RaceCardProps) {
  const { data: allSkills = [] } = useSkills(campaignId);
  const { data: mainSkills = [] } = useMainSkills(campaignId);

  // Підраховуємо реальну кількість доступних скілів для цієї раси
  const availableSkillsCount = useMemo(() => {
    const raceAvailableMainSkills = Array.isArray(race.availableSkills)
      ? race.availableSkills
      : [];

    // Якщо немає обмежень на основні навики, всі скіли доступні
    if (raceAvailableMainSkills.length === 0) {
      // Фільтруємо скіли, які доступні для цієї раси (через skill.races)
      return allSkills.filter((skill) => {
        const skillRaces = getSkillRaces(skill);

        // Якщо скіл не має обмежень по расам, він доступний
        if (!skillRaces || skillRaces.length === 0) {
          return true;
        }

        // Перевіряємо чи ID раси або назва раси є в списку доступних для скіла
        return skillRaces.includes(race.id) || skillRaces.includes(race.name);
      }).length;
    }

    // Якщо є обмеження на основні навики, фільтруємо скіли
    return allSkills.filter((skill) => {
      const mainSkillId = getSkillMainSkillId(skill);

      const skillRaces = getSkillRaces(skill);

      // Перевіряємо чи основний навик скіла є в списку доступних
      const isMainSkillAvailable = mainSkillId
        ? raceAvailableMainSkills.includes(mainSkillId)
        : true; // Скіли без основного навику доступні, якщо немає обмежень

      // Перевіряємо чи скіл доступний для цієї раси
      const isRaceAvailable =
        !skillRaces || skillRaces.length === 0
          ? true
          : skillRaces.includes(race.id) || skillRaces.includes(race.name);

      return isMainSkillAvailable && isRaceAvailable;
    }).length;
  }, [race, allSkills]);

  const disabledSkillsCount = Array.isArray(race.disabledSkills)
    ? race.disabledSkills.length
    : 0;

  // Доступні групи навиків (main skills) для відображення кольорами
  const availableMainSkillsForDisplay = useMemo(() => {
    const ids = Array.isArray(race.availableSkills) ? race.availableSkills : [];

    if (ids.length === 0) {
      return mainSkills.filter(
        (ms) => ms.id !== "racial" && ms.id !== "ultimate",
      );
    }

    return ids
      .map((id) => mainSkills.find((ms) => ms.id === id))
      .filter((ms): ms is NonNullable<typeof ms> => ms != null);
  }, [race.availableSkills, mainSkills]);

  const passiveAbility = race.passiveAbility
    ? typeof race.passiveAbility === "string"
      ? {
          description: race.passiveAbility,
          statImprovements: undefined,
          statModifiers: undefined,
        }
      : typeof race.passiveAbility === "object" && race.passiveAbility !== null
        ? {
            description:
              "description" in race.passiveAbility
                ? String(race.passiveAbility.description)
                : "",
            statImprovements:
              "statImprovements" in race.passiveAbility
                ? String(race.passiveAbility.statImprovements || "")
                : undefined,
            statModifiers:
              "statModifiers" in race.passiveAbility
                ? (race.passiveAbility.statModifiers as Record<
                    string,
                    StatModifier
                  >)
                : undefined,
          }
        : null
    : null;

  // Отримуємо всі характеристики з модифікаторами
  const modifiedAbilities = ABILITY_SCORES.filter((ability) => {
    const modifiers = passiveAbility?.statModifiers?.[ability.key];

    return (
      modifiers &&
      (modifiers.bonus || modifiers.nonNegative || modifiers.alwaysZero)
    );
  });

  return (
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate">
              {race.name}
            </CardTitle>
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
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">Доступні навики:</p>
          <div className="flex flex-wrap gap-2">
            {availableMainSkillsForDisplay.map((ms) => (
              <span
                key={ms.id}
                className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border border-current/20"
                style={{
                  backgroundColor: `${ms.color}10/50`,
                  color: `${ms.color}500`,
                  borderColor: ms.color,
                }}
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
                        className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md"
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
                              <Plus className="h-3 w-3 text-green-600" />
                            )}
                            {iconToShow === "nonNegative" && (
                              <Shield className="h-3 w-3 text-blue-600" />
                            )}
                            {iconToShow === "alwaysZero" && (
                              <Circle
                                className="h-3 w-3 text-red-600"
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
      </CardContent>
    </Card>
  );
}
