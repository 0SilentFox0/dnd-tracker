import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { prisma } from '@/lib/db';

const CAMPAIGN_ID = process.env.LOADTEST_CAMPAIGN_ID ?? 'cmuylhk0c0001ia06lg5eommv';

const PLAYERS = 6;

const OUT = '.superpowers/loadtest/users.json';

const DOMAIN = 'loadtest.example';

interface LoadUser {
    id: string;
    email: string;
    password: string;
    role: 'dm' | 'player';
}

function assertProdcopy(): void {
    if (!/\/prodcopy_[a-z0-9_]+(\?|$)/.test(process.env.DATABASE_URL ?? ''))
        throw new Error('loadtest seed runs only against prodcopy_<suffix>');
}

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

async function seed(): Promise<void> {
    const supabase = admin();

    const users: LoadUser[] = [];

    for (let i = 0; i <= PLAYERS; i++) {
        const role = i === 0 ? 'dm' : 'player';

        const email = `loadtest-${i}@${DOMAIN}`;

        const password = randomBytes(18).toString('base64url');

        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (error || !data.user)
            throw new Error(`createUser ${email}: ${error?.message}`);

        users.push({ id: data.user.id, email, password, role });
        await prisma.user.create({
            data: { id: data.user.id, email, displayName: `loadtest-${i}` },
        });
    }

    const [dm, ...players] = users;

    const heroes = await prisma.character.findMany({
        where: { campaignId: CAMPAIGN_ID, type: 'player' },
        orderBy: { id: 'asc' },
        take: PLAYERS,
        select: { id: true },
    });

    await prisma.campaign.update({
        where: { id: CAMPAIGN_ID },
        data: { dmUserId: dm.id },
    });
    await prisma.campaignMember.createMany({
        data: users.map((u) => ({
            campaignId: CAMPAIGN_ID,
            userId: u.id,
            role: u.role,
        })),
    });
    for (const [i, h] of heroes.entries())
        await prisma.character.update({
            where: { id: h.id },
            data: { controlledBy: players[i].id },
        });

    mkdirSync('.superpowers/loadtest', { recursive: true });
    writeFileSync(
        OUT,
        JSON.stringify(
            { campaignId: CAMPAIGN_ID, heroIds: heroes.map((h) => h.id), users },
            null,
            2
        ),
        { mode: 0o600 }
    );
    console.info(`seeded ${users.length} users, ${heroes.length} heroes`);
}

const TARGETS = 5;

const TARGET_PREFIX = 'loadtest-target-';

async function targets(): Promise<void> {
    const file = JSON.parse(readFileSync(OUT, 'utf8')) as {
        users: LoadUser[];
    };

    const source = await prisma.campaign.findUniqueOrThrow({
        where: { id: CAMPAIGN_ID },
        select: { rules: true },
    });

    for (let i = 0; i < TARGETS; i++) {
        const c = await prisma.campaign.create({
            data: {
                rules: source.rules ?? {},
                name: `${TARGET_PREFIX}${i}`,
                dmUserId: file.users[0].id,
                inviteCode: randomBytes(6).toString('hex'),
            },
        });

        await prisma.campaignMember.create({
            data: { campaignId: c.id, userId: file.users[0].id, role: 'dm' },
        });
    }
    console.info(`created ${TARGETS} empty target campaigns`);
}

async function cleanup(): Promise<void> {
    const { users } = JSON.parse(readFileSync(OUT, 'utf8')) as {
        users: LoadUser[];
    };

    const supabase = admin();

    await prisma.battleScene.deleteMany({
        where: { campaignId: CAMPAIGN_ID, name: { startsWith: 'loadtest-' } },
    });
    await prisma.campaign.deleteMany({
        where: {
            name: { startsWith: TARGET_PREFIX },
            dmUserId: users[0].id,
        },
    });
    await prisma.feat.deleteMany({
        where: {
            campaignId: CAMPAIGN_ID,
            name: { startsWith: 'loadtest-feat-' },
        },
    });
    for (const u of users) {
        await supabase.auth.admin.deleteUser(u.id);
    }
    console.info(`removed ${users.length} auth users and loadtest battles`);
}

async function main(): Promise<void> {
    assertProdcopy();

    if (process.argv[2] === 'cleanup') await cleanup();
    else if (process.argv[2] === 'targets') await targets();
    else await seed();
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
