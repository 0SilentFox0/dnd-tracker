import Link from 'next/link';
import { redirect } from 'next/navigation';

import { JoinByLinkPanel } from '@/components/campaigns/join/JoinByLinkPanel';
import { type GameShellNavItem } from '@/components/hud';
import { HudPage, HudPanel } from '@/components/hud/page';
import { GameShell } from '@/components/layout/GameShell';
import { Button } from '@/components/ui/button';
import { getAuthUser } from '@/lib/auth';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { RouteScope } from '@/lib/i18n/route-scope';
import { getTranslator } from '@/lib/i18n/translator';
import { getJoinPreview } from '@/lib/server/campaigns/join-campaign';
import {
    checkRateLimit,
    JOIN_RATE_LIMIT,
} from '@/lib/utils/api/rate-limit';
import { joinErrorKey } from '@/lib/utils/campaigns/join-error';

export default async function JoinByLinkPage({
    params,
}: {
    params: Promise<{ code: string }>;
}) {
    const { code } = await params;

    const locale = await getRequestLocale();

    const [user, t, tCommon] = await Promise.all([
        getAuthUser(),
        getTranslator(locale, 'campaigns'),
        getTranslator(locale, 'common'),
    ]);

    const navItems: GameShellNavItem[] = [
        {
            id: 'campaigns',
            label: tCommon('gameNavigation.campaigns'),
            href: '/campaigns',
        },
    ];

    const rate = await checkRateLimit({
        userId: user.id,
        scope: 'campaign-join-preview',
        ...JOIN_RATE_LIMIT,
        memoryFallback: true,
    });

    const preview = rate.allowed ? await getJoinPreview(user.id, code) : null;

    if (preview?.kind === 'member')
        redirect(`/campaigns/${preview.campaignId}`);

    const errorText = !preview
        ? tCommon('joinErrors.rateLimited')
        : preview.kind === 'joinable'
          ? null
          : tCommon(joinErrorKey(preview.error) ?? 'joinErrors.failed');

    return (
        <RouteScope route="list">
            <GameShell
                items={navItems}
                activeId="campaigns"
                title={t('joinLink.title')}
            >
                <HudPage width="md">
                    <HudPanel className="space-y-4">
                        {preview?.kind === 'joinable' ? (
                            <JoinByLinkPanel
                                code={code}
                                campaign={preview.campaign}
                            />
                        ) : (
                            <>
                                <p role="alert" className="text-hud-ink">
                                    {errorText}
                                </p>
                                <Button asChild variant="outline">
                                    <Link href="/campaigns">
                                        {t('joinLink.back')}
                                    </Link>
                                </Button>
                            </>
                        )}
                    </HudPanel>
                </HudPage>
            </GameShell>
        </RouteScope>
    );
}
