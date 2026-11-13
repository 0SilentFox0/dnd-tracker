import type { ReactNode } from 'react';

import { ErrorState } from '@/components/common/states';
import { NotificationsHost } from '@/components/notifications/NotificationsHost';
import { DemoTourCoordinator } from '@/components/onboarding/DemoTourCoordinator';
import { getSessionUserId } from '@/lib/auth';
import { CampaignRole, isDemoKind } from '@/lib/constants/campaigns';
import { ExtendLocaleScope } from '@/lib/i18n/extend-locale-scope';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { systemScope } from '@/lib/i18n/system-scope';
import { getTranslator } from '@/lib/i18n/translator';
import { getCampaignForLayout } from '@/lib/server/campaigns/access';
import { systemKeyOfCampaign } from '@/lib/server/campaigns/system-key';
import { isRuleSystemKey } from '@/lib/utils/rules/systems/meta';

export default async function CampaignLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ id: string }>;
}) {
    const [{ id }, userId] = await Promise.all([params, getSessionUserId()]);

    const [campaign, systemKey] = userId
        ? await Promise.all([
              getCampaignForLayout(id, userId),
              systemKeyOfCampaign(id),
          ])
        : [null, null];

    if (campaign && !isRuleSystemKey(systemKey)) {
        const t = await getTranslator(await getRequestLocale(), 'rules');

        return <ErrorState error={new Error(t('validation.unknownSystem'))} />;
    }

    const isDemo = isDemoKind(campaign?.kind);

    const isDM = campaign?.members?.[0]?.role === CampaignRole.DM;

    const content = isDemo ? (
        <ExtendLocaleScope namespaces={['demoTours']}>
            <DemoTourCoordinator campaignId={id}>
                {children}
            </DemoTourCoordinator>
        </ExtendLocaleScope>
    ) : (
        children
    );

    const key = campaign ? systemKey : null;

    const namespaces = [
        ...systemScope(key, 'campaign'),
        ...systemScope(key, 'member'),
        ...(isDM ? systemScope(key, 'dm') : []),
    ];

    return (
        <>
            {namespaces.length ? (
                <ExtendLocaleScope namespaces={namespaces}>
                    {content}
                </ExtendLocaleScope>
            ) : (
                content
            )}
            {!isDemo && <NotificationsHost campaignId={id} userId={userId} />}
        </>
    );
}
