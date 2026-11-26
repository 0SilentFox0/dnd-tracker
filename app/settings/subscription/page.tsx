import { redirect } from 'next/navigation';

import { HudFormPage } from '@/components/hud/form';
import { getSessionUserId } from '@/lib/auth';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { getTranslator } from '@/lib/i18n/translator';

export default async function SubscriptionPage() {
    if (!(await getSessionUserId()))
        redirect('/sign-in?next=/settings/subscription');

    const t = await getTranslator(await getRequestLocale(), 'auth');

    return (
        <HudFormPage header={{ title: t('settings.subscription.title') }}>
            <p className="px-4 py-3 text-hud-muted sm:px-0">
                {t('settings.subscription.soon')}
            </p>
        </HudFormPage>
    );
}
