import { redirect } from 'next/navigation';

import { ProfileClient } from './page-client';

import { getAuthUserOptional } from '@/lib/auth';
import { isOpsAdmin } from '@/lib/utils/api/ops-access';

export default async function ProfilePage() {
    const user = await getAuthUserOptional();

    if (!user) redirect('/sign-in?next=/profile');

    return <ProfileClient showOpsLink={isOpsAdmin(user)} />;
}
