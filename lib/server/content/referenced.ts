import 'server-only';
import { prisma } from '@/lib/db';
import { ContentError } from '@/lib/server/content/errors';

/** Passed to a resource's `remove`: 409 when module data still points at the row (union of all modules, D16) */
export const unreferencedGuard =
    (campaignId: string, kind: string, id: string) => async () => {
        const { systemContentRefs } = await import(
            '@/lib/server/systems/registry'
        );

        for (const source of systemContentRefs()) {
            if (source.kind !== kind || !source.error) continue;

            if ((await source.referenced(prisma, campaignId)).has(id))
                throw new ContentError(source.error, 409);
        }
    };
