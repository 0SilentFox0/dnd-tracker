import { redirect } from 'next/navigation';

import { SoundLibraryPageClient } from './page-client';

import { getSessionUserId } from '@/lib/auth';

export default async function SoundLibraryPage() {
    if (!(await getSessionUserId())) redirect('/sign-in?next=/library/sounds');

    return <SoundLibraryPageClient />;
}
