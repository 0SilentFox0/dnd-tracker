"use client";

import Link from "next/link";

import { LoadingState, QueryState } from "@/components/common/states";
import { HudFormPage } from "@/components/hud/form";
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
    <>
      <QueryState
        query={query}
        loading={
          <HudFormPage title="Редагувати скіл">
            <LoadingState rows={6} label="Завантаження скіла…" />
          </HudFormPage>
        }
      >
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
        <div className="p-4">
          <Link href={`/campaigns/${campaignId}/dm/skills`}>
            <Button variant="outline">Назад до бібліотеки скілів</Button>
          </Link>
        </div>
      )}
    </>
  );
}
