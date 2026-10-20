"use client";

import Link from "next/link";

import { ErrorState, LoadingState, QueryState } from "@/components/common/states";
import { HudFormPage } from "@/components/hud/form";
import { SkillCreateForm } from "@/components/skills/form/SkillCreateForm";
import { Button } from "@/components/ui/button";
import { useSkill } from "@/lib/hooks/skills";
import type { IdName } from "@/types/common";
import type { MainSkill } from "@/types/main-skills";

interface EditSkillClientProps {
  campaignId: string;
  skillId: string;
  spells: IdName[];
  initialMainSkills: MainSkill[];
}

export function EditSkillClient({ campaignId, skillId, spells, initialMainSkills }: EditSkillClientProps) {
  const query = useSkill(campaignId, skillId);

  if (query.isError) {
    return (
      <HudFormPage title="Редагувати скіл">
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        <div className="p-4">
          <Button variant="outline" asChild>
            <Link href={`/campaigns/${campaignId}/dm/skills`}>Назад до бібліотеки скілів</Link>
          </Button>
        </div>
      </HudFormPage>
    );
  }

  return (
    <QueryState
      query={query}
      loading={
        <HudFormPage title="Редагувати скіл">
          <LoadingState rows={6} label="Завантаження скіла…" />
        </HudFormPage>
      }
    >
      {(skill) => (
        <SkillCreateForm campaignId={campaignId} spells={spells} initialMainSkills={initialMainSkills} initialData={skill} />
      )}
    </QueryState>
  );
}
