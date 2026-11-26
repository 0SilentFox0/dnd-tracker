import { RulesForm } from '@/components/rules/RulesForm';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { getTranslator } from '@/lib/i18n/translator';
import { requireCampaignDMOrDemo } from '@/lib/server/campaigns/access';
import { parseRules } from '@/lib/utils/rules/schema';

export default async function DMRulesPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const { campaign, isDemo } = await requireCampaignDMOrDemo(id);

    const t = await getTranslator(await getRequestLocale(), 'rules');

    return (
        <RulesForm
            campaignId={id}
            title={t('page.title')}
            readOnly={isDemo}
            initial={isDemo ? parseRules(campaign.rules) : undefined}
        />
    );
}
