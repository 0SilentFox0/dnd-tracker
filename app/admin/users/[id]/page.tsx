import { notFound } from 'next/navigation';

import { UserClient } from './user-client';

import { getAuthUserOptional } from '@/lib/auth';
import { adminKeys } from '@/lib/hooks/admin';
import { PrefetchedQuery } from '@/lib/providers/prefetched-query';
import { assertAdmin } from '@/lib/server/admin/page-guard';
import { getAdminUserDetail } from '@/lib/server/admin/user-detail';

export default async function AdminUserPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await assertAdmin();

    const { id } = await params;

    const [detail, me] = await Promise.all([
        getAdminUserDetail(id),
        getAuthUserOptional(),
    ]);

    if (!detail || !me) notFound();

    return (
        <PrefetchedQuery queryKey={adminKeys.user(id)} data={detail}>
            <UserClient id={id} selfId={me.id} />
        </PrefetchedQuery>
    );
}
