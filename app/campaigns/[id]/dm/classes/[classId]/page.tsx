import { redirect } from 'next/navigation';

import { SourceNotes } from '@/components/content-import/shared/SourceNotes';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { SystemDmPage } from '@/components/systems/SystemDmPage';
import { prisma } from '@/lib/db';
import { requireCampaignDM } from '@/lib/server/campaigns/access';
import { toGameClassData } from '@/lib/utils/characters/classes/row';
import { parseRules } from '@/lib/utils/rules/schema';

export default async function EditClassPage({
    params,
}: {
    params: Promise<{ id: string; classId: string }>;
}) {
    const { id, classId } = await params;

    const { campaign } = await requireCampaignDM(id);

    const row = await prisma.gameClass.findFirst({
        where: { id: classId, campaignId: id },
    });

    if (!row) redirect(`/campaigns/${id}/dm/classes`);

    return (
        <>
            <OnboardingHint
                id="dm.class-map"
                className="mx-auto mb-3 max-w-5xl"
            />
            <SourceNotes campaignId={id} kind="classes" targetId={classId} />
            <SystemDmPage
                campaignId={id}
                section="classes"
                system={parseRules(campaign.rules).system}
                canEdit
                view={{ type: 'edit', id: classId }}
                data={toGameClassData(row)}
            />
        </>
    );
}
