import '@/lib/server/systems/registry';
import { CampaignGameShell } from '@/app/campaigns/[id]/campaign-game-shell';
import { Journal } from '@/components/quests/Journal';
import { questKeys } from '@/lib/hooks/quests';
import { ExtendLocaleScope } from '@/lib/i18n/extend-locale-scope';
import { PrefetchedQuery } from '@/lib/providers/prefetched-query';
import { requireCampaignMember } from '@/lib/server/campaigns/access';
import { readQuests } from '@/lib/server/quests/store';

export default async function JournalPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ quest?: string; create?: string }>;
}) {
    const [{ id }, entry] = await Promise.all([params, searchParams]);

    const access = await requireCampaignMember(id);

    const data = await readQuests(id, access);

    const content = (
        <PrefetchedQuery queryKey={questKeys.list(id)} data={data}>
            <ExtendLocaleScope namespaces={['quests']}>
                <Journal
                    key={`${entry.quest ?? ''}|${entry.create ?? ''}`}
                    entry={entry}
                    campaignId={id}
                    isDM={access.isDM}
                    readOnly={access.isDemo}
                />
            </ExtendLocaleScope>
        </PrefetchedQuery>
    );

    return (
        <CampaignGameShell
            campaign={access.campaign}
            viewer={access}
            active="journal"
        >
            {content}
        </CampaignGameShell>
    );
}
