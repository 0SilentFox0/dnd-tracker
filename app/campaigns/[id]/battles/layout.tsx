import { CampaignSystemGate } from '@/components/systems/CampaignSystemGate';
import { RouteScope } from '@/lib/i18n/route-scope';
import { systemSelectionOfCampaign } from '@/lib/server/systems/campaign-system';

export default async function Layout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <RouteScope route="[id]/battles" campaignId={id}>
            <CampaignSystemGate
                campaignId={id}
                system={await systemSelectionOfCampaign(id)}
            >
                {children}
            </CampaignSystemGate>
        </RouteScope>
    );
}
