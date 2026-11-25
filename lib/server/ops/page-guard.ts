import { notFound } from 'next/navigation';

import 'server-only';
import { getSessionUserId } from '@/lib/auth';
import { isPlatformAdmin } from '@/lib/utils/api/platform-admin';

/** Layouts and pages render in parallel, so both call this before touching data. */
export async function assertOpsAdmin(): Promise<void> {
    const userId = await getSessionUserId();

    if (!userId || !isPlatformAdmin(userId)) notFound();
}
