import { ContentTransferButtons } from '@/components/content-import/ContentTransferButtons';
import { HudPage, HudPageHeader } from '@/components/hud/page';
import { SpellGroupList } from '@/components/spells/groups/SpellGroupList';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { getTranslator } from '@/lib/i18n/translator';
import { requireCampaignDMOrDemo } from '@/lib/server/campaigns/access';

export default async function DMSpellGroupsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const { isDemo } = await requireCampaignDMOrDemo(id);

    const t = await getTranslator(await getRequestLocale(), 'spells');

    return (
        <HudPage>
            <HudPageHeader
                title={t('schools.title')}
                subtitle={t('schools.subtitle')}
                actions={
                    !isDemo && (
                        <ContentTransferButtons
                            campaignId={id}
                            kind="spell-groups"
                        />
                    )
                }
            />
            <SpellGroupList campaignId={id} canEdit={!isDemo} />
        </HudPage>
    );
}
