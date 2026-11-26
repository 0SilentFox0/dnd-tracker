import { redirect } from 'next/navigation';

import { ProfileClient } from './page-client';

import { getAuthUserOptional } from '@/lib/auth';
import { getProfileSummary } from '@/lib/server/profile/summary';
import { isAdmin } from '@/lib/utils/api/admin-access';

const nowMs = () => Date.now();

export default async function ProfilePage() {
    const user = await getAuthUserOptional();

    if (!user) redirect('/sign-in?next=/profile');

    const summary = await getProfileSummary(user.id);

    return (
        <ProfileClient
            profile={{
                showOpsLink: isAdmin(user),
                summary,
                now: nowMs(),
            }}
        />
    );
}
