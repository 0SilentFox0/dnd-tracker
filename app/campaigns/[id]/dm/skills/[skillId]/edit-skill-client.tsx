"use client";

import Link from "next/link";

import { LoadingState, QueryState } from "@/components/common/states";
import { SkillCreateForm } from "@/components/skills/form/SkillCreateForm";
import { Button } from "@/components/ui/button";
import { useSkill } from "@/lib/hooks/skills";
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
  const query = useSkill(campaignId, skillId);

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-4">
      <QueryState query={query} loading={<LoadingState rows={6} label="Завантаження скіла…" />}>
        {(skill) => (
          <SkillCreateForm
            campaignId={campaignId}
            spells={spells}
            spellGroups={spellGroups}
            initialMainSkills={initialMainSkills}
            initialData={skill as unknown as GroupedSkill}
          />
        )}
      </QueryState>
      {query.isError && (
        <Link href={`/campaigns/${campaignId}/dm/skills`}>
          <Button variant="outline">Назад до бібліотеки скілів</Button>
        </Link>
      )}
    </div>
  );
}
