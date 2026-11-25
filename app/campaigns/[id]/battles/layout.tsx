import { CampaignSystemGate } from '@/components/systems/CampaignSystemGate';
import { ExtendLocaleScope } from '@/lib/i18n/extend-locale-scope';
import { BATTLE_NAMESPACES } from '@/lib/i18n/scopes';
import { logScope, systemPackScope } from '@/lib/i18n/system-scope';
import {
    systemOfCampaign,
    systemSelectionOfCampaign,
} from '@/lib/server/systems/campaign-system';

export default async function Layout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const system = await systemOfCampaign(id);

    const namespaces = [
        ...BATTLE_NAMESPACES,
        ...systemPackScope(system, 'battle'),
        ...logScope(system),
    ];

    return (
        <ExtendLocaleScope namespaces={namespaces}>
            <CampaignSystemGate
                campaignId={id}
                system={await systemSelectionOfCampaign(id)}
            >
                {children}
            </CampaignSystemGate>
        </ExtendLocaleScope>
    );
}
