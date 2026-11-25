import Link from 'next/link';

import { HudPanel } from '@/components/hud/page';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { getTranslator } from '@/lib/i18n/translator';
import { readActiveQuestSummary } from '@/lib/server/quests/store';

export async function ActiveQuests({
    campaignId,
    isDM,
}: {
    campaignId: string;
    isDM: boolean;
}) {
    const [t, { count, items }] = await Promise.all([
        getTranslator(await getRequestLocale(), 'quests'),
        readActiveQuestSummary(campaignId, isDM),
    ]);

    return (
        <HudPanel className="space-y-3">
            <h2 className="hud-sc text-sm tracking-widest text-hud-gold">
                {t('activeTitle')}{' '}
                <span className="text-hud-muted">({count})</span>
            </h2>
            {items.map((q) => (
                <Link
                    className="block rounded border border-hud-line p-3 text-sm text-hud-ink hover:border-hud-muted"
                    key={q.id}
                    href={`/campaigns/${campaignId}/journal?quest=${encodeURIComponent(q.id)}`}
                >
                    {q.title}
                </Link>
            ))}
            {!count && (
                <p className="text-sm text-hud-muted">
                    {t(isDM ? 'empty' : 'emptyPlayer')}
                </p>
            )}
            <Link
                className="inline-flex min-h-10 items-center text-sm text-hud-gold underline"
                href={`/campaigns/${campaignId}/journal${isDM && !count ? '?create=1' : ''}`}
            >
                {t(isDM && !count ? 'new' : 'open')}
            </Link>
        </HudPanel>
    );
}
