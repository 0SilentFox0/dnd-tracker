"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { SkillCreateForm } from "@/components/skills/form/SkillCreateForm";
import { Button } from "@/components/ui/button";
import { getSkill } from "@/lib/api/skills";
import type { MainSkill } from "@/types/main-skills";
import type { GroupedSkill } from "@/types/skills";

interface EditSkillClientProps {
  campaignId: string;
  skillId: string;
  spells: { id: string; name: string }[];
  spellGroups: { id: string; name: string }[];
  initialMainSkills: MainSkill[];
}

export function EditSkillClient({
  campaignId,
  skillId,
  spells,
  spellGroups,
  initialMainSkills,
}: EditSkillClientProps) {
  const {
    data: skill,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ["skill", campaignId, skillId],
    queryFn: () => getSkill(campaignId, skillId),
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl text-center py-12">
        <p className="text-muted-foreground">Завантаження скіла...</p>
      </div>
    );
  }

  if (isError || !skill) {
    return (
      <div className="container mx-auto p-4 max-w-4xl text-center py-12 space-y-4">
        <p className="text-destructive">
          {error instanceof Error ? error.message : "Скіл не знайдено"}
        </p>
        <Link href={`/campaigns/${campaignId}/dm/skills`}>
          <Button variant="outline">Назад до бібліотеки скілів</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <SkillCreateForm
        campaignId={campaignId}
        spells={spells}
        spellGroups={spellGroups}
        initialMainSkills={initialMainSkills}
        initialData={skill as unknown as GroupedSkill}
      />
    </div>
  );
}
