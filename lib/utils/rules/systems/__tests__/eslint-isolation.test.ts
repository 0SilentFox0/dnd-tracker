import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

import {
    readImportsExempt,
    SYSTEM_ROOTS,
} from '@/scripts/shared/system-ratchet';
import {
    foreignSystemGroup,
    parseRequires,
} from '@/scripts/shared/system-requires.mjs';

type RuleEntry = [
    string,
    {
        paths?: ({ name: string } | string)[];
        patterns?: { group: string[]; allowTypeImports?: boolean }[];
    }?,
];

const configOf = async (filePath: string) =>
    (await new ESLint({ cwd: process.cwd() }).calculateConfigForFile(
        filePath
    )) as { rules: Record<string, RuleEntry | undefined> };

const restricted = async (filePath: string) => {
    const config = await configOf(filePath);

    const opts = config.rules['no-restricted-imports']?.[1];

    return {
        groups: (opts?.patterns ?? []).flatMap((p) => p.group),
        names: (opts?.paths ?? []).map((p) =>
            typeof p === 'string' ? p : p.name
        ),
        zone: (config.rules['systems/zone']?.[1]?.patterns ?? []).flatMap(
            (p) => p.group
        ),
    };
};

const ZONE = '@/systems/*';

describe('system import zones', () => {
    it.each([
        'lib/utils/battle/foo.ts',
        'components/characters/Foo.tsx',
        'lib/hooks/characters/useX.ts',
        'app/api/campaigns/foo/route.ts',
    ])('%s may reach systems only through the roots', async (file) => {
        const r = await restricted(file);

        expect(r.zone).toContain(ZONE);
    });

    it.each(['types/foo.ts', 'scripts/foo.ts'])(
        '%s may reach systems only through the roots',
        async (file) => expect((await restricted(file)).zone).toContain(ZONE)
    );

    it('keeps the layer rules next to the zone', async () => {
        expect((await restricted('lib/utils/battle/foo.ts')).names).toContain(
            '@/lib/db'
        );
        expect((await restricted('lib/utils/battle/foo.ts')).groups).toContain(
            '@/app'
        );
        expect(
            (await restricted('components/characters/Foo.tsx')).groups
        ).toContain('@/lib/api');
        expect(
            (await restricted('lib/utils/battle/modes/maze/foo.ts')).zone
        ).toContain(ZONE);
    });

    it.each([...SYSTEM_ROOTS, ...readImportsExempt().map((e) => e.file)])(
        '%s is outside the zone and keeps its layer rules',
        async (file) => {
            const r = await restricted(file);

            expect(r.zone).toEqual([]);
            expect(r.groups.length).toBeGreaterThan(0);
        }
    );

    it('does not cover tests, system code or the template system scripts', async () => {
        for (const file of [
            'lib/utils/battle/__tests__/foo.test.ts',
            'systems/wfrp/rules/x.ts',
            'scripts/templates/systems/wfrp/x.ts',
            'scripts/templates/systems/homm/x.ts',
        ])
            expect((await restricted(file)).zone).toEqual([]);
    });

    it('lets ui/** import wire types from systems/*/api but not values', async () => {
        const config = await configOf('systems/wfrp/ui/x.tsx');

        const pattern = config.rules[
            'no-restricted-imports'
        ]?.[1]?.patterns?.find((p) => p.group.includes('@/systems/*/api'));

        expect(pattern?.allowTypeImports).toBe(true);
    });

    it('applies layer rules inside a system', async () => {
        const rules = await restricted('systems/wfrp/rules/x.ts');

        expect(rules.names).toContain('@/lib/db');
        expect(rules.groups).toEqual(
            expect.arrayContaining(['@/app', '@/scripts', '@/lib/server'])
        );

        const ui = await restricted('systems/wfrp/ui/x.tsx');

        expect(ui.groups).toEqual(
            expect.arrayContaining(['@/lib/api', '@/systems/*/api', '@/app'])
        );

        expect(rules.groups).toEqual(
            expect.arrayContaining([
                '@/lib/utils/api/*',
                '!@/lib/utils/api/content-error',
            ])
        );

        expect(ui.names).toContain('@/lib/db');
        expect(ui.groups).toEqual(
            expect.arrayContaining(['@/lib/server', '@/systems/*/server'])
        );

        const hooks = await restricted('systems/wfrp/hooks/x.ts');

        expect(hooks.names).toContain('@/lib/db');
        expect(hooks.groups).toEqual(
            expect.arrayContaining([
                '@/lib/server',
                '@/lib/server/*',
                '@/systems/*/server',
                '@/systems/*/server/*',
            ])
        );

        for (const file of [
            'systems/wfrp/hooks/x.ts',
            'systems/wfrp/api/x.ts',
            'systems/wfrp/server/x.ts',
        ])
            expect((await restricted(file)).groups).toEqual(
                expect.arrayContaining(['@/app', '@/scripts'])
            );
    });
});

describe('system requires isolation', () => {
    const ids = ['alpha', 'beta', 'gamma'];

    it('forbids every other system when nothing is required', () => {
        expect(foreignSystemGroup('alpha', ids, () => [])).toEqual([
            '@/systems/beta/**',
            '@/systems/gamma/**',
        ]);
    });

    it('allows the required module folders and forbids the rest', () => {
        const requires = (id: string) =>
            id === 'beta' ? parseRequires('requires: ["alpha", "d20"],') : [];

        expect(foreignSystemGroup('beta', ids, requires)).toEqual([
            '@/systems/gamma/**',
        ]);
        expect(foreignSystemGroup('gamma', ids, requires)).toEqual([
            '@/systems/alpha/**',
            '@/systems/beta/**',
        ]);
    });

    it('parses requires from meta source and ignores other arrays', () => {
        expect(
            parseRequires(
                'keys: ["x"],\n requires: [\n"a", \'b\',\n],\n conflicts: ["c"]'
            )
        ).toEqual(['a', 'b']);
        expect(parseRequires('keys: ["x"]')).toEqual([]);
    });
});
