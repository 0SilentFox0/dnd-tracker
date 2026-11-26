import { notFound } from 'next/navigation';

import 'server-only';
import { getAuthUserOptional } from '@/lib/auth';
import { isAdmin } from '@/lib/utils/api/admin-access';

/** Layouts and pages render in parallel, so both call this before touching data. */
export async function assertAdmin(): Promise<void> {
    const user = await getAuthUserOptional();

    if (!user || !isAdmin(user)) notFound();
}
