import { signOutUser } from '@/lib/server/admin/auth-admin';
import { runUserAction } from '@/lib/server/admin/run-user-action';

export const dynamic = 'force-dynamic';

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    return runUserAction({ params, action: 'signout' }, async ({ id }) => {
        await signOutUser(id);
    });
}
