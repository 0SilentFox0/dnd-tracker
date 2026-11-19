import { redirect } from 'next/navigation';

import { ProfileClient } from './page-client';

import { getSessionUserId } from '@/lib/auth';

export default async function ProfilePage() {
    if (!(await getSessionUserId())) redirect('/sign-in?next=/profile');

    return <ProfileClient />;
}
