import { UsersClient } from './users-client';

import { assertAdmin } from '@/lib/server/admin/page-guard';

export default async function AdminUsersPage() {
    await assertAdmin();

    return <UsersClient />;
}
