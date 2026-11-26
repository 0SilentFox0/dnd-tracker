import { AdminSoon } from '@/components/admin/AdminSoon';
import { assertAdmin } from '@/lib/server/admin/page-guard';

export default async function AdminOverviewPage() {
    await assertAdmin();

    return <AdminSoon />;
}
