import './print.css';
import { RouteScope } from '@/lib/i18n/route-scope';

export default async function PrintLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <RouteScope route="[id]/dm/print" campaignId={id}>
            <div className="print-page">{children}</div>
        </RouteScope>
    );
}
