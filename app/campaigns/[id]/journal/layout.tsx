import type { ReactNode } from 'react';

import SystemLayout from '@/app/campaigns/[id]/system-layout';
import { ExtendLocaleScope } from '@/lib/i18n/extend-locale-scope';

export default function JournalLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ id: string }>;
}) {
    return (
        <ExtendLocaleScope namespaces={['quests', 'scenario', 'world']}>
            <SystemLayout params={params}>{children}</SystemLayout>
        </ExtendLocaleScope>
    );
}
