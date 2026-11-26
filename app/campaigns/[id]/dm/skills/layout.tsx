import { RouteScope } from '@/lib/i18n/route-scope';
import { dmSectionLayout } from '@/lib/server/campaigns/dm-section-layout';

const Section = dmSectionLayout('skills');

export default async function Layout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <RouteScope route="[id]/dm/skills" campaignId={id}>
            <Section params={params}>{children}</Section>
        </RouteScope>
    );
}
