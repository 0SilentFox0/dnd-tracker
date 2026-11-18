#!/usr/bin/env tsx
import '@/lib/utils/rules/systems/registry';
import { LEGACY_THREAD_TITLE } from '@/lib/constants/ai';
import { prisma } from '@/lib/db';
import { assertSeedTarget } from '@/scripts/seed/seed-library-lib';

async function main() {
    const args = process.argv.slice(2);

    const apply = args.includes('--apply');

    const host = assertSeedTarget(
        process.env.DATABASE_URL,
        args.includes('--allow-remote')
    );

    console.log(`БД: ${host}${apply ? '' : ' · DRY RUN'}`);

    const where = { title: LEGACY_THREAD_TITLE };

    const count = apply
        ? (await prisma.aiThread.updateMany({ where, data: { title: '' } }))
              .count
        : await prisma.aiThread.count({ where });

    console.log(
        `тредів «${LEGACY_THREAD_TITLE}»: ${count} · ${apply ? 'оновлено' : 'оновив би'}`
    );
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
