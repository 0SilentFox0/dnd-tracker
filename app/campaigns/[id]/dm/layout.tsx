import type { ReactNode } from 'react';

import SystemLayout from '@/app/campaigns/[id]/system-layout';

export default function DmLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ id: string }>;
}) {
    return <SystemLayout params={params}>{children}</SystemLayout>;
}
