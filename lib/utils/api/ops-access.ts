import 'server-only';
import { isPlatformAdmin } from '@/lib/utils/api/platform-admin';

export function isOpsAdmin(user: {
    id: string;
    email: string | null;
}): boolean {
    const emails = (process.env.OPS_ADMIN_EMAILS ?? '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

    return (
        (!!user.email && emails.includes(user.email.toLowerCase())) ||
        isPlatformAdmin(user.id)
    );
}
