import SystemLayout from '@/app/campaigns/[id]/system-layout';
import { RouteScope } from '@/lib/i18n/route-scope';

export default async function Layout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <RouteScope route="[id]/show" campaignId={id}>
            <SystemLayout params={params}>{children}</SystemLayout>
        </RouteScope>
    );
}
