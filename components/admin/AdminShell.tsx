'use client';

import type { ReactNode } from 'react';

import { AdminNav } from '@/components/admin/AdminNav';
import { HudPage } from '@/components/hud/page';

export function AdminShell({ children }: { children: ReactNode }) {
    return (
        <HudPage className="flex flex-col gap-4 space-y-0 md:flex-row md:items-start">
            <AdminNav />
            <main className="min-w-0 flex-1 space-y-4">{children}</main>
        </HudPage>
    );
}
