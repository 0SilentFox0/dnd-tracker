import { HudPage } from "@/components/hud/page";
import { OnboardingHint } from "@/components/onboarding/OnboardingHint";
import { SkillTreeEditor } from "@/components/skill-tree/editor";

export function SkillTreePageClient({ campaignId }: { campaignId: string }) {
  return (
    <HudPage className="max-w-[1600px]">
      <OnboardingHint id="dm.skill-trees" className="mb-3" />
      <SkillTreeEditor campaignId={campaignId} />
    </HudPage>
  );
}
