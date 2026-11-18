import { HudFormPage } from '@/components/hud/form';
import { HudPage, HudPageHeader, HudPanel } from '@/components/hud/page';
import { RulesForm } from '@/components/rules/RulesForm';
import type { Namespace } from '@/lib/i18n/config';
import { ExtendLocaleScope } from '@/lib/i18n/extend-locale-scope';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { rulesFormScope, systemScope } from '@/lib/i18n/system-scope';
import { getTranslator } from '@/lib/i18n/translator';
import { requireCampaignDMOrDemo } from '@/lib/server/campaigns/access';
import { systemOfCampaign } from '@/lib/server/systems/campaign-system';
import { MECHANIC_REGISTRY } from '@/lib/utils/rules';
import { parseRules } from '@/lib/utils/rules/schema';
import { ALL_SECTIONS } from '@/lib/utils/rules/section-registry';

export default async function DMRulesPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const { campaign, isDemo } = await requireCampaignDMOrDemo(id);

    const t = await getTranslator(await getRequestLocale(), 'rules');

    if (isDemo) {
        const rules = parseRules(campaign.rules);

        const locale = await getRequestLocale();

        const labels = Object.fromEntries(
            await Promise.all(
                Object.keys(MECHANIC_REGISTRY).map(async (key) => {
                    const ns = ALL_SECTIONS[key]?.labels;

                    return [
                        key,
                        ns
                            ? (await getTranslator(locale, ns as Namespace))(
                                  'label'
                              )
                            : t(`mechanics.${key}.label`),
                    ];
                })
            )
        );

        return (
            <HudPage>
                <HudPageHeader title={t('page.title')} />
                <div className="space-y-3">
                    {Object.keys(MECHANIC_REGISTRY).map((key) => (
                        <HudPanel key={key}>
                            <h2 className="hud-sc mb-2 text-lg text-hud-ink">
                                {labels[key]}
                            </h2>
                            <pre className="overflow-x-auto text-xs whitespace-pre-wrap text-hud-bone">
                                {JSON.stringify(
                                    rules[key as keyof typeof rules],
                                    null,
                                    2
                                )}
                            </pre>
                        </HudPanel>
                    ))}
                </div>
            </HudPage>
        );
    }

    const form = (
        <HudFormPage title={t('page.title')}>
            <RulesForm campaignId={id} />
        </HudFormPage>
    );

    const namespaces = [
        ...new Set([
            ...systemScope(await systemOfCampaign(id), 'dmRules'),
            ...rulesFormScope(),
        ]),
    ];

    return namespaces.length ? (
        <ExtendLocaleScope namespaces={namespaces}>{form}</ExtendLocaleScope>
    ) : (
        form
    );
}
