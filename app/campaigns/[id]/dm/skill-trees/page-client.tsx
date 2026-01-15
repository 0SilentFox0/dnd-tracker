"use client";

import { useState, useMemo } from "react";
import { CircularSkillTree } from "@/components/skill-tree/CircularSkillTree";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type {
  SkillTree,
  Skill,
  CentralSkill,
  UltimateSkill,
} from "@/lib/types/skill-tree";

interface SkillTreePageClientProps {
  campaignId: string;
  skillTrees: (SkillTree | { id: string; campaignId: string; race: string; skills: unknown; createdAt: Date })[];
}

// Конвертуємо Prisma формат в наш формат
function convertPrismaToSkillTree(
  prismaTree: {
    id: string;
    campaignId: string;
    race: string;
    skills: unknown;
    createdAt: Date;
  }
): SkillTree | null {
  try {
    const skillsData = prismaTree.skills as
      | SkillTree
      | { mainSkills?: SkillTree["mainSkills"] };
    
    if ((skillsData as SkillTree).mainSkills) {
      // Вже правильний формат
      return skillsData as SkillTree;
    } else if ((skillsData as { mainSkills?: SkillTree["mainSkills"] }).mainSkills) {
      // Prisma формат з mainSkills
      const data = skillsData as {
        mainSkills: SkillTree["mainSkills"];
        centralSkills?: SkillTree["centralSkills"];
        ultimateSkill?: SkillTree["ultimateSkill"];
      };
      return {
        id: prismaTree.id,
        campaignId: prismaTree.campaignId,
        race: prismaTree.race,
        mainSkills: data.mainSkills,
        centralSkills: data.centralSkills || [],
        ultimateSkill:
          data.ultimateSkill ||
          ({
            id: `${prismaTree.race}_ultimate`,
            name: "Ультимативний навик",
            description: "Могутній навик",
            requiredCentralSkillIds: [],
          } as UltimateSkill),
        createdAt: prismaTree.createdAt,
      };
    }
  } catch (error) {
    console.error("Error converting skill tree:", error);
  }
  return null;
}

export function SkillTreePageClient({
  campaignId,
  skillTrees,
}: SkillTreePageClientProps) {
  const [selectedRace, setSelectedRace] = useState<string>(
    skillTrees[0]?.race || ""
  );

  // Конвертуємо всі дерева в правильний формат
  const convertedTrees = useMemo(() => {
    return skillTrees.map((st) => {
      if ((st as SkillTree).mainSkills) {
        return st as SkillTree;
      }
      return convertPrismaToSkillTree(
        st as {
          id: string;
          campaignId: string;
          race: string;
          skills: unknown;
          createdAt: Date;
        }
      );
    }).filter((st): st is SkillTree => st !== null);
  }, [skillTrees]);

  // Знаходимо вибране дерево
  const skillTree = convertedTrees.find((st) => st.race === selectedRace) || null;

  const handleSkillClick = (skill: Skill) => {
    console.log("Skill clicked:", skill);
    // Тут буде логіка вивчення навики
  };

  const handleCentralSkillClick = (skill: CentralSkill) => {
    console.log("Central skill clicked:", skill);
    // Тут буде логіка вивчення центрального навику
  };

  const handleUltimateSkillClick = (skill: UltimateSkill) => {
    console.log("Ultimate skill clicked:", skill);
    // Тут буде логіка вивчення ультимативного навику
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Дерева Прокачки</CardTitle>
          <CardDescription>
            Налаштування дерев прокачки для рас
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Вибір раси */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Раса:</label>
            <Select value={selectedRace} onValueChange={setSelectedRace}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Виберіть расу" />
              </SelectTrigger>
              <SelectContent>
                {convertedTrees.map((st) => (
                  <SelectItem key={st.race} value={st.race}>
                    {st.race}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Кругове дерево */}
          {skillTree ? (
            <CircularSkillTree
              skillTree={skillTree}
              unlockedSkills={[]}
              unlockedCentralSkills={[]}
              unlockedUltimateSkill={false}
              onSkillClick={handleSkillClick}
              onCentralSkillClick={handleCentralSkillClick}
              onUltimateSkillClick={handleUltimateSkillClick}
            />
          ) : (
            <div className="text-center text-gray-500 py-8">
              Дерево прокачки для раси &quot;{selectedRace}&quot; не знайдено
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
