import { BattleList } from '@/components/battle/list/BattleList';
import { BattleListActions } from '@/components/battle/list/BattleListActions';
import { HudPage, HudPageHeader } from '@/components/hud/page';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { getTranslator } from '@/lib/i18n/translator';
import { loadBattleListCards } from '@/lib/server/battles/list-cards';
import { requireCampaignDMOrDemo } from '@/lib/server/campaigns/access';

export default async function DMBattlesPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const { isDemo } = await requireCampaignDMOrDemo(id);

    const canEdit = !isDemo;

    const t = await getTranslator(await getRequestLocale(), 'battleSetup');

    const battles = await loadBattleListCards(id);

    return (
        <HudPage width="list">
            <HudPageHeader
                title={t('list.page.title')}
                subtitle={t('list.page.subtitle')}
                actions={
                    canEdit && (
                        <BattleListActions
                            campaignId={id}
                            battlesCount={battles.length}
                        />
                    )
                }
            />
            {canEdit && <OnboardingHint id="dm.battles" />}

            <BattleList battles={battles} campaignId={id} canEdit={canEdit} />
        </HudPage>
    );
}
