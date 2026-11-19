import type { ReactNode } from 'react';

import SystemLayout from '@/app/campaigns/[id]/system-layout';
import { ExtendLocaleScope } from '@/lib/i18n/extend-locale-scope';

export default function DmLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ id: string }>;
}) {
    return (
        <ExtendLocaleScope namespaces={['contentCopy']}>
            <SystemLayout params={params}>{children}</SystemLayout>
        </ExtendLocaleScope>
    );
}
