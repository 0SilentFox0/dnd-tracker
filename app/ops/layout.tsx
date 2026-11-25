import type { Metadata } from 'next';

import { LocaleScope } from '@/lib/i18n/locale-scope';
import { assertOpsAdmin } from '@/lib/server/ops/page-guard';

export const metadata: Metadata = {
    title: 'Ops',
    robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function OpsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await assertOpsAdmin();

    return <LocaleScope namespaces={['common', 'ops']}>{children}</LocaleScope>;
}
