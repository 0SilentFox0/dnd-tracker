import type { Metadata } from 'next';

import { AdminShell } from '@/components/admin/AdminShell';
import { LocaleScope } from '@/lib/i18n/locale-scope';
import { assertAdmin } from '@/lib/server/admin/page-guard';

export const metadata: Metadata = {
    title: 'Admin',
    robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await assertAdmin();

    return (
        <LocaleScope namespaces={['common', 'admin', 'ops']}>
            <AdminShell>{children}</AdminShell>
        </LocaleScope>
    );
}
