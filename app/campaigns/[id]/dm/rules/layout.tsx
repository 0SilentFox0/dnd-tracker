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
        <RouteScope route="[id]/dm/rules" campaignId={id}>
            {children}
        </RouteScope>
    );
}
