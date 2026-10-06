"use client";

import { HudPage } from "@/components/hud/page";
import { SkillTreeEditor } from "@/components/skill-tree/editor";

export function SkillTreePageClient({ campaignId }: { campaignId: string }) {
  return (
    <HudPage className="max-w-7xl">
      <SkillTreeEditor campaignId={campaignId} />
    </HudPage>
  );
}
