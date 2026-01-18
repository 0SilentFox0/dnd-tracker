"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SkillTreeCardProps {
  isDMMode: boolean;
  playerLevel?: number;
  unlockedSkillsCount?: number;
  maxSkills?: number;
  children: React.ReactNode;
}

export function SkillTreeCard({
  isDMMode,
  playerLevel,
  unlockedSkillsCount,
  maxSkills,
  children,
}: SkillTreeCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex justify-between gap-2 w-full items-center">
            <span>{isDMMode ? "Редактор Скілів" : "Дерево Прокачки"}</span>
            {!isDMMode && playerLevel !== undefined && (
              <span className="text-sm font-normal">
                Рівень {playerLevel} ({unlockedSkillsCount ?? 0}/{maxSkills ?? 0})
              </span>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          {isDMMode
            ? "Налаштування дерев прокачки для рас"
            : "Виберіть навики для прокачки"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}
