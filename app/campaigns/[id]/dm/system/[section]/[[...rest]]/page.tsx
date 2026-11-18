import { notFound, redirect } from 'next/navigation';

import { SystemDmPage } from '@/components/systems/SystemDmPage';
import { requireCampaignDMOrDemo } from '@/lib/server/campaigns/access';
import { systemServerOf } from '@/lib/server/systems/registry';
import { parseRules } from '@/lib/utils/rules/schema';
import { dmSectionsOf } from '@/lib/utils/rules/systems/catalog';

export default async function DMSystemSectionPage({
    params,
}: {
    params: Promise<{ id: string; section: string; rest?: string[] }>;
}) {
    const { id, section, rest = [] } = await params;

    const { campaign, isDemo } = await requireCampaignDMOrDemo(id);

    const rules = parseRules(campaign.rules);

    const { system } = rules;

    if (!dmSectionsOf(system).has(section)) notFound();

    const dmPages = systemServerOf(rules).dmPages;

    const resolve =
        dmPages && Object.hasOwn(dmPages, section)
            ? dmPages[section]
            : undefined;

    if (!resolve && rest.length > 0) notFound();

    const page = resolve ? await resolve({ campaignId: id, rest }) : undefined;

    if (page === null) notFound();

    if (page && page.view.type !== 'list' && isDemo)
        redirect(`/campaigns/${id}`);

    return (
        <SystemDmPage
            campaignId={id}
            section={section}
            system={system}
            canEdit={!isDemo}
            view={page?.view}
            data={page?.data}
        />
    );
}
