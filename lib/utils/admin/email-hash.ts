import { createHmac } from 'node:crypto';

import 'server-only';

export function hashEmail(
    email: string,
    secret: string | undefined
): string | null {
    if (!secret) return null;

    return createHmac('sha256', secret)
        .update(email.trim().toLowerCase())
        .digest('hex');
}
