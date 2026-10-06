"use client";

import { SkillTreeEditor } from "@/components/skill-tree/editor";

export function SkillTreePageClient({ campaignId }: { campaignId: string }) {
  return (
    <div className="container mx-auto max-w-7xl p-4">
      <SkillTreeEditor campaignId={campaignId} />
    </div>
  );
}
