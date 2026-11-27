import { type Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';

export type AdminActionKind = 'ban' | 'unban' | 'signout' | 'delete';

export async function logAdminAction(
    input: {
        adminUserId: string;
        action: AdminActionKind;
        targetUserId: string;
        meta?: Record<string, unknown>;
    },
    db: Pick<typeof prisma, 'adminAction'> = prisma
): Promise<void> {
    await db.adminAction.create({
        data: {
            adminUserId: input.adminUserId,
            action: input.action,
            targetUserId: input.targetUserId,
            meta: (input.meta ?? {}) as Prisma.InputJsonValue,
        },
    });
}
