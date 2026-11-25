import { notFound } from 'next/navigation';

import 'server-only';
import { getAuthUserOptional } from '@/lib/auth';
import { isOpsAdmin } from '@/lib/utils/api/ops-access';

/** Layouts and pages render in parallel, so both call this before touching data. */
export async function assertOpsAdmin(): Promise<void> {
    const user = await getAuthUserOptional();

    if (!user || !isOpsAdmin(user)) notFound();
}
