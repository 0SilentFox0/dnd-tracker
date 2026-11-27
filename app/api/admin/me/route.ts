import { getAuthUserOptional } from '@/lib/auth';
import { isAdmin } from '@/lib/utils/api/admin-access';
import { privateJson } from '@/lib/utils/api/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
    const user = await getAuthUserOptional();

    return privateJson({ isAdmin: !!user && isAdmin(user) });
}
