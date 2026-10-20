import { DMSkillsPageClient } from "./page-client";

import { readSkills } from "@/app/api/campaigns/[id]/skills/read-skills";
import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { skillKeys } from "@/lib/hooks/skills/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";
import { readOkJson } from "@/lib/utils/api/read-json";
import type { Skill } from "@/types/skills";

export default async function DMSkillsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  const skills = await readOkJson<Skill[]>(await readSkills({ id, accessChecked: true }));

  return (
    <PrefetchedQuery queryKey={skillKeys.list(id)} data={skills}>
      <DMSkillsPageClient campaignId={id} />
    </PrefetchedQuery>
  );
}
