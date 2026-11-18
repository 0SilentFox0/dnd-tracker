#!/usr/bin/env tsx
import { READ_ONLY_API_TOKEN_SCOPES } from '@/lib/constants/ai';
import { prisma } from '@/lib/db';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

/** One-off: tokens that carry `ai` get every `*:read` scope, so the catalog read tools stop answering 403. Dry-run unless --apply. */
async function main() {
    const args = process.argv.slice(2);

    const apply = args.includes('--apply');

    const host = assertSeedTarget(
        process.env.DATABASE_URL,
        args.includes('--allow-remote')
    );

    console.log(`DB: ${host}${apply ? '' : ' · DRY RUN'}`);

    const tokens = await prisma.apiToken.findMany({
        where: { scopes: { has: 'ai' } },
        select: { id: true, name: true, scopes: true },
    });

    let changed = 0;

    for (const t of tokens) {
        const next = [...new Set([...t.scopes, ...READ_ONLY_API_TOKEN_SCOPES])];

        if (next.length === t.scopes.length) continue;

        changed++;
        console.log(`${t.id} ${t.name}: [${t.scopes}] -> [${next}]`);

        if (apply)
            await prisma.apiToken.update({
                where: { id: t.id },
                data: { scopes: next },
            });
    }

    console.log(
        `${changed} of ${tokens.length} tokens ${apply ? 'updated' : 'would change'}`
    );
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
