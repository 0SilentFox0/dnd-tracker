import { banSchema } from '@/lib/schemas/admin';
import { banUser } from '@/lib/server/admin/auth-admin';
import { runUserAction } from '@/lib/server/admin/run-user-action';

export const dynamic = 'force-dynamic';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    return runUserAction(
        { params, action: 'ban', request, schema: banSchema },
        async ({ id }, { hours }) => {
            const { signedOut } = await banUser(id, hours);

            return { hours, signedOut };
        }
    );
}
