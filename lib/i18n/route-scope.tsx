import { ExtendLocaleScope } from './extend-locale-scope';
import { type RouteKey, routeNamespaces } from './route-scopes';

import { systemOfCampaign } from '@/lib/server/systems/campaign-system';

export async function RouteScope({
    route,
    campaignId,
    children,
}: {
    route: RouteKey;
    campaignId?: string;
    children: React.ReactNode;
}) {
    const system = campaignId ? await systemOfCampaign(campaignId) : null;

    const namespaces = routeNamespaces(route, system);

    return namespaces.length ? (
        <ExtendLocaleScope namespaces={namespaces}>
            {children}
        </ExtendLocaleScope>
    ) : (
        <>{children}</>
    );
}
