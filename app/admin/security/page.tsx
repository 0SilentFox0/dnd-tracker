import { SecurityClient } from './security-client';

import { assertAdmin } from '@/lib/server/admin/page-guard';

export default async function AdminSecurityPage() {
    await assertAdmin();

    return <SecurityClient />;
}
