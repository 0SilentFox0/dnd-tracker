import { ExtendLocaleScope } from '@/lib/i18n/extend-locale-scope';
import { BATTLE_NAMESPACES } from '@/lib/i18n/scopes';
import { logScope, systemScope } from '@/lib/i18n/system-scope';
import { systemOfCampaign } from '@/lib/server/systems/campaign-system';

export default async function Layout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const namespaces = [
        ...BATTLE_NAMESPACES,
        ...systemScope(await systemOfCampaign(id), 'battle'),
        ...logScope(),
    ];

    return (
        <ExtendLocaleScope namespaces={namespaces}>
            {children}
        </ExtendLocaleScope>
    );
}
