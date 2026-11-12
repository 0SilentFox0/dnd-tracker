#!/usr/bin/env tsx
// pnpm template <index|validate|build|import|publish|icons|export|backfill-keys|backfill-slugs|backfill-locale|i18n> ...  (see USAGE)
import {
    assertOnlyFlags,
    COMMAND_USAGE,
    parseCommandArgs,
} from './lib/cli-args';
import { i18nCommand } from './lib/i18n-command';
import { writeIndex } from './lib/index-gen';
import { readPack } from './lib/pack';
import { validatePack } from './lib/validate';

const USAGE = Object.values(COMMAND_USAGE).join('\n  ');

type Command = (args: string[]) => Promise<void> | void;

async function backfillKeys(args: string[]) {
    assertOnlyFlags(args, 'backfill-keys');

    const [
        { assertSeedTarget },
        { prisma },
        { CampaignKind, CampaignVisibility },
        { planKeyBackfill },
    ] = await Promise.all([
        import('../seed/seed-library-lib'),
        import('@/lib/db'),
        import('@/lib/constants/campaigns'),
        import('./lib/store'),
    ]);

    try {
        assertSeedTarget(
            process.env.DATABASE_URL,
            args.includes('--allow-remote')
        );

        const rows = await prisma.campaign.findMany({
            where: {
                kind: CampaignKind.TEMPLATE,
                visibility: CampaignVisibility.OFFICIAL,
            },
            select: { id: true, name: true, templateKey: true, locale: true },
        });

        const plan = planKeyBackfill(rows);

        for (const { id, from, to } of plan)
            console.info(
                `${id}  ${rows.find((row) => row.id === id)?.name} [${rows.find((row) => row.id === id)?.locale ?? 'en'}]: ${from ?? 'null'} -> ${to}`
            );

        console.info(
            `${plan.length} row(s) to update${args.includes('--apply') ? '' : ' (dry run, pass --apply to write)'}`
        );

        if (args.includes('--apply'))
            await prisma.$transaction(
                plan.map(({ id, to }) =>
                    prisma.campaign.update({
                        where: { id },
                        data: { templateKey: to },
                    })
                )
            );
    } finally {
        await prisma.$disconnect();
    }
}

function validate(args: string[]) {
    const { key } = parseCommandArgs(args, undefined, false, 'validate');

    const issues = validatePack(readPack(key), {});

    for (const issue of issues)
        console[issue.level === 'error' ? 'error' : 'warn'](
            `${issue.level}: ${issue.message}`
        );

    const errors = issues.filter((issue) => issue.level === 'error').length;

    console.info(
        `${key}: ${errors} error(s), ${issues.length - errors} warning(s)`
    );

    if (errors > 0) process.exitCode = 1;
}

async function build(args: string[]) {
    const { key, flags, options } = parseCommandArgs(
        args,
        undefined,
        false,
        'build'
    );

    const { buildPack } = await import('./lib/build');

    await buildPack(key, {
        initSlugs: flags.has('--init-slugs'),
        args: options['--source'] ? ['--source', options['--source']] : [],
    });
}

async function importCommand(args: string[]) {
    const { key, flags, options } = parseCommandArgs(
        args,
        undefined,
        false,
        'import'
    );

    const [{ importPack }, { prisma }] = await Promise.all([
        import('./lib/import-pack'),
        import('@/lib/db'),
    ]);

    try {
        const result = await importPack(key, {
            owner: options['--owner'],
            dryRun: flags.has('--dry-run'),
            publish: flags.has('--publish'),
            prune: flags.has('--prune'),
            allowUntranslated: flags.has('--allow-untranslated'),
            allowRemote: flags.has('--allow-remote'),
        });

        console.info(JSON.stringify(result.perKind));

        if (Object.values(result.perKind).some((c) => c.errors > 0))
            process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

async function backfillSlugsCommand(args: string[]) {
    const { key, flags } = parseCommandArgs(
        args,
        undefined,
        false,
        'backfill-slugs'
    );

    const [{ backfillSlugs }, { prisma }] = await Promise.all([
        import('./lib/backfill-slugs'),
        import('@/lib/db'),
    ]);

    try {
        const result = await backfillSlugs(key, {
            apply: flags.has('--apply'),
            allowRemote: flags.has('--allow-remote'),
        });

        console.info(
            `${result.plan.length} row(s) to slug${flags.has('--apply') ? `, ${result.written} written` : ' (dry run, pass --apply to write)'}`
        );
    } finally {
        await prisma.$disconnect();
    }
}

async function backfillLocaleCommand(args: string[]) {
    const { key, flags, options } = parseCommandArgs(
        args,
        undefined,
        false,
        'backfill-locale'
    );

    const [{ backfillLocale }, { prisma }] = await Promise.all([
        import('./lib/locale-backfill'),
        import('@/lib/db'),
    ]);

    try {
        await backfillLocale(key, {
            locale: options['--locale'],
            apply: flags.has('--apply'),
            allowRemote: flags.has('--allow-remote'),
        });
    } finally {
        await prisma.$disconnect();
    }
}

async function publish(args: string[]) {
    const { key, flags } = parseCommandArgs(args, undefined, false, 'publish');

    const [{ publishPack }, { prisma }] = await Promise.all([
        import('./lib/import-pack'),
        import('@/lib/db'),
    ]);

    try {
        const result = await publishPack(key, {
            allowUntranslated: flags.has('--allow-untranslated'),
            allowRemote: flags.has('--allow-remote'),
        });

        console.info(
            `version ${result.contentVersion}, ${result.changedRows} changed row(s)`
        );
    } finally {
        await prisma.$disconnect();
    }
}

async function icons(args: string[]) {
    const { key, flags, options } = parseCommandArgs(
        args,
        undefined,
        false,
        'icons'
    );

    if (!options['--dir']) throw new Error('--dir <images> is required');

    const [{ uploadIcons }, { prisma }] = await Promise.all([
        import('./lib/icons-upload'),
        import('@/lib/db'),
    ]);

    try {
        const { skipped } = await uploadIcons(key, {
            dir: options['--dir'],
            dryRun: flags.has('--dry-run'),
            allowRemote: flags.has('--allow-remote'),
            kinds: options['--kinds']?.split(','),
        });

        if (skipped > 0) process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

const COMMANDS: Record<string, Command> = {
    validate,
    build,
    import: importCommand,
    publish,
    icons,
    export: (args) =>
        import('./lib/export-command').then(({ exportCommand }) =>
            exportCommand(args)
        ),
    index: (args) => {
        assertOnlyFlags(args, 'index');
        writeIndex();
        console.info(
            'data/templates/manifests.ts and dictionaries.server.ts are up to date'
        );
    },
    'backfill-keys': backfillKeys,
    'backfill-slugs': backfillSlugsCommand,
    'backfill-locale': backfillLocaleCommand,
    i18n: (args) => i18nCommand(args),
};

async function main() {
    const [name, ...args] = process.argv.slice(2);

    const command = name ? COMMANDS[name] : undefined;

    if (!command) throw new Error(`Usage:\n  ${USAGE}`);

    await command(args);
}

void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
