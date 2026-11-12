import { HudPage } from '@/components/hud/page';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { SkillTreeEditor } from '@/components/skill-tree/editor';
import { SkillTreeTransferButtons } from '@/components/skill-tree/SkillTreeTransferButtons';

export function SkillTreePageClient({
    campaignId,
    canEdit = true,
}: {
    campaignId: string;
    canEdit?: boolean;
}) {
    return (
        <HudPage className="max-w-[1600px]">
            {canEdit && <OnboardingHint id="dm.skill-trees" className="mb-3" />}
            {canEdit && (
                <div className="mb-3">
                    <SkillTreeTransferButtons campaignId={campaignId} />
                </div>
            )}
            <SkillTreeEditor campaignId={campaignId} canEdit={canEdit} />
        </HudPage>
    );
}
