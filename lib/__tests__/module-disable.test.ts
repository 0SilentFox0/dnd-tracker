import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    contentKindsOf,
    dmSectionsOf,
} from '@/lib/utils/rules/systems/catalog';
import { ROOT } from '@/scripts/shared/system-ratchet';

const OWNED_PAGES = [
    'app/campaigns/[id]/dm/skill-trees',
    'app/campaigns/[id]/dm/skills',
    'app/campaigns/[id]/dm/main-skills',
    'app/campaigns/[id]/dm/artifact-sets',
    'app/campaigns/[id]/dm/print/skills',
] as const;

const walk = (rel: string): string[] =>
    fs
        .readdirSync(path.join(ROOT, rel), { withFileTypes: true })
        .flatMap((e) =>
            e.isDirectory()
                ? walk(`${rel}/${e.name}`)
                : /\.tsx?$/.test(e.name)
                  ? [`${rel}/${e.name}`]
                  : []
        );

describe('switching a module off closes its surface', () => {
    const bare = { key: 'd20', modules: [] as string[] };

    const on = (id: string) => ({ key: 'd20', modules: [id] });

    it.each([
        ['skilltrees', ['skills', 'skill-trees'], ['main-skills', 'skills']],
        ['artifactsets', ['artifact-sets'], ['artifact-sets']],
    ])('%s: sections and content kinds exist only with the module', (id, sections, kinds) => {
        for (const section of sections) {
            expect(dmSectionsOf(bare).has(section)).toBe(false);
            expect(dmSectionsOf(on(id)).has(section)).toBe(true);
        }

        for (const kind of kinds) {
            expect(contentKindsOf(bare).has(kind)).toBe(false);
            expect(contentKindsOf(on(id)).has(kind)).toBe(true);
        }
    });

    it('every owned DM page layout is gated by dmSectionLayout', () => {
        const ungated = OWNED_PAGES.filter(
            (dir) =>
                !walk(dir).some(
                    (f) =>
                        f.endsWith('layout.tsx') &&
                        fs
                            .readFileSync(path.join(ROOT, f), 'utf8')
                            .includes('dmSectionLayout(')
                )
        );

        expect(ungated).toEqual([]);
    });

    it('the pages of skilltrees and artifactsets never import a module directly', () => {
        const direct = OWNED_PAGES.flatMap(walk).filter((f) =>
            fs.readFileSync(path.join(ROOT, f), 'utf8').includes("@/systems/")
        );

        expect(direct).toEqual([]);
    });
});
