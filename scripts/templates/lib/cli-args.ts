import { listPackKeys, TEMPLATES_DIR } from './pack';

export interface CommandArgs {
    key: string;
    flags: Set<string>;
    options: Record<string, string>;
    rest: string[];
}

/** Single source of the command grammar: `cli.ts` prints it as USAGE and `parseCommandArgs` derives the allowed options from it. */
export const COMMAND_USAGE = {
    index: 'pnpm template index',
    validate: 'pnpm template validate <key>',
    build: 'pnpm template build <key> [--source <dir>] [--init-slugs]',
    import: 'pnpm template import <key> [--owner <userId>] [--dry-run] [--publish] [--prune] [--allow-untranslated] [--allow-remote]',
    publish:
        'pnpm template publish <key> [--allow-untranslated] [--allow-remote]',
    icons: 'pnpm template icons <key> --dir <images> [--kinds a,b] [--dry-run] [--allow-remote]',
    export: 'pnpm template export <key> --from <campaignId> [--system <system>] [--name <name>] [--slugs <file>]',
    'backfill-keys': 'pnpm template backfill-keys [--apply] [--allow-remote]',
    'backfill-slugs':
        'pnpm template backfill-slugs <key> [--apply] [--allow-remote]',
    'backfill-locale':
        'pnpm template backfill-locale <key> [--locale uk] [--apply] [--allow-remote]',
    i18n: 'pnpm template i18n <extract|apply|normalize|status|convert> <key> <locale>',
} as const;

export type TemplateCommand = keyof typeof COMMAND_USAGE;

export const allowedOptions = (command: TemplateCommand): Set<string> =>
    new Set(COMMAND_USAGE[command].match(/--[a-z][a-z-]*/g) ?? []);

const VALUE_FLAGS = new Set([
    '--owner',
    '--dir',
    '--kinds',
    '--source',
    '--from',
    '--system',
    '--name',
    '--slugs',
    '--locale',
]);

/** `<key> [--flag] [--option value] ...rest`; the key must be a pack folder unless `allowNewKey`. */
export function parseCommandArgs(
    args: string[],
    dir = TEMPLATES_DIR,
    allowNewKey = false,
    command?: TemplateCommand
): CommandArgs {
    const [key, ...tail] = args;

    const known = listPackKeys(dir);

    if (!key || key.startsWith('--') || (!allowNewKey && !known.includes(key)))
        throw new Error(
            `Unknown pack ${key ? `"${key}"` : '(missing)'}; known packs: ${known.join(', ')}`
        );

    const flags = new Set<string>();

    const options: Record<string, string> = {};

    const rest: string[] = [];

    const allowed = command ? allowedOptions(command) : null;

    for (let i = 0; i < tail.length; i++) {
        const arg = tail[i];

        if (allowed && arg.startsWith('--') && !allowed.has(arg))
            throw new Error(
                `Unknown option ${arg} for "${command}"; allowed: ${[...allowed].join(', ') || '(none)'}`
            );

        if (VALUE_FLAGS.has(arg)) {
            const value = tail[i + 1];

            if (!value || value.startsWith('--'))
                throw new Error(`${arg} needs a value`);

            options[arg] = value;
            i += 1;
        } else if (arg.startsWith('--')) flags.add(arg);
        else rest.push(arg);
    }

    return { key, flags, options, rest };
}

/** For keyless commands: every argument must be an allowed flag. */
export function assertOnlyFlags(
    args: string[],
    command: TemplateCommand
): void {
    const allowed = allowedOptions(command);

    const bad = args.find((arg) => !allowed.has(arg));

    if (bad)
        throw new Error(
            `Unknown option ${bad} for "${command}"; allowed: ${[...allowed].join(', ') || '(none)'}`
        );
}
